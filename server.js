const express = require('express');
const axios = require('axios');
require('dotenv').config();
const lolRoutes = require('./routes/lol.js');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Log para debug da chave da API
console.log('Chave da API:', process.env.RIOT_API_KEY ? 'Presente' : 'Ausente');

// Middleware para processar JSON
app.use(express.json());

// Middleware para logging de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rotas da API
app.use('/api', lolRoutes);

// Servir arquivos estáticos depois das rotas da API
app.use(express.static('public'));

// Configuração do Axios para a API da Riot
const riotApi = axios.create({
    baseURL: 'https://americas.api.riotgames.com', // API global
    headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY
    }
});

// Log para debug da configuração da API
console.log('Configuração da API Global:', {
    baseURL: riotApi.defaults.baseURL,
    headers: riotApi.defaults.headers
});

// Configuração do Axios para a API regional
const regionalApi = axios.create({
    baseURL: 'https://br1.api.riotgames.com',
    headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY
    }
});

// Log para debug da configuração da API Regional
console.log('Configuração da API Regional:', {
    baseURL: regionalApi.defaults.baseURL,
    headers: regionalApi.defaults.headers
});

// Rota para buscar informações de um invocador
app.get('/api/summoner/:name/:tag', async (req, res) => {
    try {
        const { name, tag } = req.params;
        console.log(`Buscando jogador: ${name}#${tag}`);

        // Verificar se a chave da API está configurada
        if (!process.env.RIOT_API_KEY) {
            console.error('Chave da API da Riot não configurada');
            throw new Error('Configuração da API inválida');
        }

        // Primeiro, buscar na API global
        let accountResponse;
        try {
            const url = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
            console.log('Fazendo requisição para:', url);
            console.log('Headers da requisição:', riotApi.defaults.headers);

            accountResponse = await riotApi.get(url);
            console.log('Resposta completa da API global:', {
                status: accountResponse.status,
                headers: accountResponse.headers,
                data: accountResponse.data
            });
        } catch (error) {
            console.error('Erro na API global:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                url: error.config?.url
            });
            throw new Error('Erro ao buscar conta do invocador');
        }

        const account = accountResponse.data;
        console.log('Dados da conta extraídos:', {
            gameName: account?.gameName,
            tagLine: account?.tagLine,
            puuid: account?.puuid,
            rawData: account
        });

        if (!account || !account.puuid) {
            console.error('Resposta da API global inválida:', account);
            throw new Error('Resposta da API global inválida');
        }

        // Validar campos essenciais da conta
        if (!account.gameName || !account.tagLine) {
            console.error('Dados da conta incompletos:', account);
            throw new Error('Dados da conta incompletos');
        }

        // Agora buscar detalhes do invocador na API regional
        let summonerResponse;
        try {
            const url = `/lol/summoner/v4/summoners/by-puuid/${account.puuid}`;
            console.log('Fazendo requisição para:', url);

            summonerResponse = await regionalApi.get(url);
            console.log('Resposta completa da API regional:', {
                status: summonerResponse.status,
                headers: summonerResponse.headers,
                data: summonerResponse.data
            });
        } catch (error) {
            console.error('Erro na API regional:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                url: error.config?.url
            });
            throw new Error('Erro ao buscar detalhes do invocador');
        }

        const summonerData = summonerResponse.data;
        console.log('Dados do invocador extraídos:', {
            id: summonerData?.id,
            profileIconId: summonerData?.profileIconId,
            summonerLevel: summonerData?.summonerLevel,
            rawData: summonerData
        });

        if (!summonerData || !summonerData.id) {
            console.error('Resposta da API regional inválida:', summonerData);
            throw new Error('Resposta da API regional inválida');
        }

        // Construir objeto de resposta com os dados corretos
        const responseData = {
            id: summonerData.id,
            accountId: summonerData.accountId,
            puuid: account.puuid,
            profileIconId: summonerData.profileIconId,
            revisionDate: summonerData.revisionDate,
            summonerLevel: summonerData.summonerLevel,
            name: account.gameName,
            tag: account.tagLine
        };

        // Log dos dados finais
        console.log('Dados finais que serão enviados:', responseData);

        // Enviar resposta
        res.json(responseData);
    } catch (error) {
        console.error('Erro ao buscar invocador:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        res.status(error.response?.status || 500).json({
            error: error.message || 'Erro interno do servidor'
        });
    }
});

// Rota para buscar maestria de campeões
app.get('/api/mastery/:puuid', async (req, res) => {
    try {
        const { puuid } = req.params;
        console.log(`Buscando maestrias para PUUID: ${puuid}`);

        const response = await regionalApi.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`);
        console.log(`Encontradas ${response.data.length} maestrias`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar maestrias:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.status?.message || 'Erro interno do servidor'
        });
    }
});

// Rota para buscar ranking do invocador
app.get('/api/rank/:summonerId', async (req, res) => {
    try {
        const { summonerId } = req.params;
        console.log(`Buscando ranking para summonerId: ${summonerId}`);

        const response = await regionalApi.get(`/lol/league/v4/entries/by-summoner/${summonerId}`);
        console.log('Dados de ranking:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar ranking:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.status?.message || 'Erro interno do servidor'
        });
    }
});

// Rota para buscar histórico de partidas
app.get('/api/match-history/:puuid', async (req, res) => {
    try {
        const { puuid } = req.params;
        console.log(`Buscando histórico de partidas para PUUID: ${puuid}`);

        // Primeiro, buscar a lista de IDs das partidas
        const matchListResponse = await riotApi.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`);

        // Depois, buscar os detalhes de cada partida
        const matchDetails = await Promise.all(
            matchListResponse.data.map(async (matchId) => {
                const matchResponse = await riotApi.get(`/lol/match/v5/matches/${matchId}`);
                return matchResponse.data;
            })
        );

        // Processar os dados das partidas
        const processedMatches = matchDetails.map(match => {
            const participant = match.info.participants.find(p => p.puuid === puuid);
            return {
                timestamp: match.info.gameCreation,
                championId: participant.championId,
                win: participant.win,
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                totalMinionsKilled: participant.totalMinionsKilled
            };
        });

        console.log(`Processadas ${processedMatches.length} partidas`);
        res.json(processedMatches);
    } catch (error) {
        console.error('Erro ao buscar histórico de partidas:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.status?.message || 'Erro interno do servidor'
        });
    }
});

// Rota para adicionar jogador ao ranking
app.post('/api/ranking/add', async (req, res) => {
    try {
        const { summonerName, tier, rank, lp, tierValue, profileIconId } = req.body;

        // Verificar se o jogador já existe
        const { data: existingPlayer } = await supabase
            .from('ranked_players')
            .select()
            .eq('summoner_name', summonerName)
            .single();

        if (existingPlayer) {
            // Atualizar dados do jogador existente
            const { error } = await supabase
                .from('ranked_players')
                .update({
                    tier,
                    rank,
                    lp,
                    tier_value: tierValue,
                    profile_icon_id: profileIconId,
                    created_at: new Date().toISOString()
                })
                .eq('summoner_name', summonerName);

            if (error) throw error;
        } else {
            // Adicionar novo jogador
            const { error } = await supabase
                .from('ranked_players')
                .insert([{
                    summoner_name: summonerName,
                    tier,
                    rank,
                    lp,
                    tier_value: tierValue,
                    profile_icon_id: profileIconId,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
        }

        res.json({ message: 'Jogador adicionado/atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao adicionar ao ranking:', error);
        res.status(500).json({ error: 'Erro ao adicionar ao ranking' });
    }
});

// Rota para obter o ranking
app.get('/api/ranking', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ranked_players')
            .select('*')
            .order('tier_value', { ascending: false })
            .order('lp', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({ error: 'Erro ao buscar ranking' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
