const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

// Configuração do Axios para a API da Riot
const riotApi = axios.create({
    baseURL: 'https://br1.api.riotgames.com',
    headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY
    }
});

const americasApi = axios.create({
    baseURL: 'https://americas.api.riotgames.com',
    headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY
    }
});

// Middleware de logging
router.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Rota para buscar informações de um invocador
router.get('/summoner/:name/:tag', async (req, res) => {
    try {
        console.log('Buscando invocador:', req.params);
        const { name, tag } = req.params;

        console.log('Fazendo requisição para Riot ID API...');
        const riotIdResponse = await axios.get(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
            headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
        });
        console.log('Resposta da Riot ID API:', riotIdResponse.data);

        const puuid = riotIdResponse.data.puuid;
        console.log('PUUID obtido:', puuid);

        console.log('Fazendo requisição para Summoner API...');
        const summonerResponse = await axios.get(`https://br1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, {
            headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
        });
        console.log('Resposta da Summoner API:', summonerResponse.data);

        const response = {
            ...summonerResponse.data,
            puuid: puuid,
            gameName: riotIdResponse.data.gameName,
            tagLine: riotIdResponse.data.tagLine
        };
        console.log('Resposta final:', response);

        res.json(response);
    } catch (error) {
        console.error('Erro ao buscar invocador:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.status?.message || 'Erro interno do servidor'
        });
    }
});

// Rota para buscar maestria de campeões
router.get('/mastery/:puuid', async (req, res) => {
    try {
        const { puuid } = req.params;
        const response = await riotApi.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.status?.message || 'Erro interno do servidor'
        });
    }
});

// Rota para buscar ranking do invocador
router.get('/rank/:summonerId', async (req, res) => {
    try {
        const { summonerId } = req.params;
        const response = await riotApi.get(`/lol/league/v4/entries/by-summoner/${summonerId}`);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.status?.message || 'Erro interno do servidor'
        });
    }
});

// Rota para buscar histórico de partidas
router.get('/matches/:puuid', async (req, res) => {
    try {
        const { puuid } = req.params;
        const count = req.query.count || 10;

        // Primeiro, buscar os IDs das últimas partidas
        const matchIdsResponse = await americasApi.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`);
        const matchIds = matchIdsResponse.data;

        // Depois, buscar os detalhes de cada partida
        const matchPromises = matchIds.map(matchId =>
            americasApi.get(`/lol/match/v5/matches/${matchId}`)
        );

        const matches = await Promise.all(matchPromises);
        const matchDetails = matches.map(match => {
            const gameData = match.data;
            const participant = gameData.info.participants.find(p => p.puuid === puuid);

            return {
                gameId: gameData.metadata.matchId,
                champion: participant.championName,
                championId: participant.championId,
                win: participant.win,
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                gameMode: gameData.info.gameMode,
                gameDuration: gameData.info.gameDuration,
                gameCreation: gameData.info.gameCreation,
                role: participant.teamPosition || participant.role,
                cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
                items: [
                    participant.item0,
                    participant.item1,
                    participant.item2,
                    participant.item3,
                    participant.item4,
                    participant.item5,
                    participant.item6
                ]
            };
        });

        res.json(matchDetails);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.status?.message || 'Erro interno do servidor'
        });
    }
});

module.exports = router;