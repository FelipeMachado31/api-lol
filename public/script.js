console.log('Script carregado');

let championData = {};

async function getChampionData() {
    try {
        const response = await fetch('https://ddragon.leagueoflegends.com/cdn/13.24.1/data/pt_BR/champion.json');
        const data = await response.json();
        championData = data.data;
        console.log('Dados dos campeões carregados com sucesso');
    } catch (error) {
        console.error('Erro ao carregar dados dos campeões:', error);
        alert('Erro ao carregar dados dos campeões. A página pode não funcionar corretamente.');
    }
}

function getRankInfo(rankData) {
    if (!rankData || rankData.length === 0) return 'Não ranqueado';

    const soloQueue = rankData.find(queue => queue.queueType === 'RANKED_SOLO_5x5');
    if (!soloQueue) return 'Não ranqueado';

    const tier = soloQueue.tier.toLowerCase();
    const rank = soloQueue.rank;
    const lp = soloQueue.leaguePoints;
    const wins = soloQueue.wins;
    const losses = soloQueue.losses;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    // Atualizar informações de winrate
    const winrateText = document.getElementById('winrateInfo');
    const winrateProgress = document.getElementById('winrateProgress');
    winrateText.textContent = `Taxa de Vitória: ${winRate}% (${wins}V - ${losses}D)`;
    winrateProgress.style.width = `${winRate}%`;

    return `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${rank} ${lp} LP`;
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}m atrás`;
    return 'Agora mesmo';
}

function formatGameDuration(duration) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function buscarInvocador() {
    console.log('Iniciando busca do invocador...');
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.classList.remove('hidden');
        console.log('Loading exibido ao buscar invocador');
    }
    document.getElementById('result').classList.add('hidden');

    const summonerName = document.getElementById('summonerName').value.trim();
    const summonerTag = document.getElementById('summonerTag').value.trim();

    if (!summonerName || !summonerTag) {
        alert('Por favor, preencha o nome do invocador e a tag.');
        return;
    }

    try {
        console.log('Iniciando busca do invocador:', { summonerName, summonerTag });

        // Buscar informações do invocador
        const summonerResponse = await fetch(`/api/summoner/${encodeURIComponent(summonerName)}/${encodeURIComponent(summonerTag)}`);
        const summonerData = await summonerResponse.json();

        if (!summonerResponse.ok) {
            console.error('Erro na resposta do servidor:', {
                status: summonerResponse.status,
                data: summonerData
            });
            throw new Error(summonerData.error || 'Erro ao buscar invocador');
        }

        console.log('Dados do invocador recebidos:', summonerData);

        // Verificar se todos os dados necessários estão presentes
        const requiredFields = ['gameName', 'tagLine', 'profileIconId', 'summonerLevel', 'id', 'puuid'];
        const missingFields = requiredFields.filter(field => !summonerData[field]);

        if (missingFields.length > 0) {
            console.error('Dados do invocador incompletos:', {
                missingFields,
                receivedData: summonerData
            });
            throw new Error(`Dados do invocador incompletos. Campos faltando: ${missingFields.join(', ')}`);
        }

        // Atualizar informações do perfil
        document.getElementById('profileIcon').src = `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${summonerData.profileIconId}.png`;
        document.getElementById('levelNumber').textContent = summonerData.summonerLevel;

        // Atualizar nome e tag do invocador
        const summonerNameDisplay = document.getElementById('summonerNameDisplay');
        summonerNameDisplay.textContent = `${summonerData.gameName}#${summonerData.tagLine}`;

        // Buscar ranking do invocador
        console.log('Buscando ranking...');
        const rankResponse = await fetch(`/api/rank/${summonerData.id}`);
        const rankData = await rankResponse.json();

        if (rankResponse.ok) {
            console.log('Dados de ranking recebidos:', rankData);
            document.getElementById('rankInfo').textContent = getRankInfo(rankData);
        } else {
            console.log('Invocador não ranqueado');
            document.getElementById('rankInfo').textContent = 'Não ranqueado';
            // Limpar informações de winrate
            document.getElementById('winrateInfo').textContent = '';
            document.getElementById('winrateProgress').style.width = '0%';
        }

        // Buscar maestria dos campeões
        console.log('Buscando maestrias...');
        const masteryResponse = await fetch(`/api/mastery/${summonerData.puuid}`);
        const masteryData = await masteryResponse.json();

        if (masteryResponse.ok) {
            console.log('Dados de maestria recebidos:', masteryData);
            const masteryContainer = document.getElementById('championMastery');
            masteryContainer.innerHTML = '';

            masteryData.slice(0, 5).forEach(mastery => {
                const champion = Object.values(championData).find(champ => champ.key === mastery.championId.toString());
                if (champion) {
                    const card = document.createElement('div');
                    card.className = 'champion-card';
                    card.innerHTML = `
                        <img src="https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${champion.id}.png" 
                             alt="${champion.name}" 
                             class="champion-icon">
                        <div class="champion-info">
                            <div class="champion-name">${champion.name}</div>
                            <div class="mastery-level">Maestria ${mastery.championLevel}</div>
                            <div class="mastery-points">${mastery.championPoints.toLocaleString()} pontos</div>
                        </div>
                    `;
                    masteryContainer.appendChild(card);
                }
            });
        } else {
            console.log('Erro ao buscar maestrias:', masteryData.error);
            document.getElementById('championMastery').innerHTML = '<p>Erro ao carregar maestrias</p>';
        }

        // Buscar histórico de partidas
        console.log('Buscando histórico de partidas...');
        const matchHistoryResponse = await fetch(`/api/match-history/${summonerData.puuid}`);
        const matchHistoryData = await matchHistoryResponse.json();

        if (matchHistoryResponse.ok) {
            console.log('Dados do histórico de partidas recebidos:', matchHistoryData);
            const matchHistoryContainer = document.getElementById('matchHistory');
            matchHistoryContainer.innerHTML = '';

            matchHistoryData.slice(0, 5).forEach(match => {
                const champion = Object.values(championData).find(champ => champ.key === match.championId.toString());
                if (champion) {
                    const card = document.createElement('div');
                    card.className = 'match-card';
                    card.innerHTML = `
                        <div class="match-result ${match.win ? 'victory' : 'defeat'}">
                            ${match.win ? 'Vitória' : 'Derrota'}
                        </div>
                        <div class="match-details">
                            <div class="match-champion">
                                <img src="https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${champion.id}.png" 
                                     alt="${champion.name}" 
                                     class="champion-icon-small">
                                <span>${champion.name}</span>
                            </div>
                            <div class="match-stats">
                                <span>KDA: ${match.kills}/${match.deaths}/${match.assists}</span>
                                <span>CS: ${match.totalMinionsKilled}</span>
                            </div>
                        </div>
                        <div class="match-time">
                            ${formatTimeAgo(match.timestamp)}
                        </div>
                    `;
                    matchHistoryContainer.appendChild(card);
                }
            });
        } else {
            console.log('Erro ao buscar histórico de partidas:', matchHistoryData.error);
            document.getElementById('matchHistory').innerHTML = '<p>Erro ao carregar histórico de partidas</p>';
        }

        document.getElementById('result').classList.remove('hidden');
    } catch (error) {
        console.error('Erro:', error);
        alert(error.message || 'Erro ao buscar informações do invocador. Por favor, tente novamente.');
    } finally {
        if (loadingEl) {
            loadingEl.classList.add('hidden');
            console.log('Loading escondido ao finalizar busca');
        }
    }
}

function calcularTierValue(tier, rank) {
    // Ordem dos tiers do LoL
    const tierOrder = [
        'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'
    ];
    const rankOrder = ['IV', 'III', 'II', 'I'];
    const tierIndex = tierOrder.indexOf(tier.toUpperCase());
    const rankIndex = rankOrder.indexOf(rank.toUpperCase());
    if (tierIndex === -1 || rankIndex === -1) return 0;
    return tierIndex * 4 + rankIndex;
}

async function adicionarAoRanking() {
    // Extrair informações do perfil exibido
    const summonerNameDisplay = document.getElementById('summonerNameDisplay').textContent;
    const summonerName = summonerNameDisplay.split('#')[0];
    const profileIconUrl = document.getElementById('profileIcon').src;
    const profileIconId = parseInt(profileIconUrl.match(/\/([0-9]+)\.png/)[1]);
    const rankInfo = document.getElementById('rankInfo').textContent;

    // Extrair tier, rank e lp do texto do rankInfo
    let tier = '', rank = '', lp = 0;
    if (rankInfo && rankInfo !== 'Não ranqueado') {
        const match = rankInfo.match(/([A-Za-zçÇ]+) ([IV]+) (\d+) LP/);
        if (match) {
            tier = match[1].toUpperCase();
            rank = match[2];
            lp = parseInt(match[3]);
        }
    } else {
        alert('Invocador não ranqueado. Não é possível adicionar ao ranking.');
        return;
    }
    const tierValue = calcularTierValue(tier, rank);

    try {
        const response = await fetch('/api/ranking/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summonerName,
                tier,
                rank,
                lp,
                tierValue,
                profileIconId
            })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Invocador adicionado ao ranking com sucesso!');
        } else {
            throw new Error(data.error || 'Erro ao adicionar ao ranking');
        }
    } catch (error) {
        console.error('Erro ao adicionar ao ranking:', error);
        alert(error.message || 'Erro ao adicionar ao ranking. Por favor, tente novamente.');
    }
}

// Carregar dados dos campeões quando a página carregar
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM carregado');
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.classList.add('hidden');
        console.log('Loading escondido no DOMContentLoaded');
    } else {
        console.log('Elemento #loading não encontrado');
    }
    getChampionData();
});

// Adicionar evento de tecla Enter nos campos de input
document.getElementById('summonerName').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        document.getElementById('summonerTag').focus();
    }
});

document.getElementById('summonerTag').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        buscarInvocador();
    }
}); 