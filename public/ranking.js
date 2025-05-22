// Função para carregar o ranking
async function loadRanking() {
    try {
        const response = await fetch('/api/ranking');
        const rankingData = await response.json();

        const rankingBody = document.getElementById('rankingBody');
        rankingBody.innerHTML = '';

        rankingData.forEach((player, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><img src="https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${player.profile_icon_id}.png" alt="Ícone" style="width:24px;height:24px;vertical-align:middle;margin-right:8px;">${player.summoner_name}</td>
                <td>${player.tier || '-'}</td>
                <td>${player.rank || '-'}</td>
                <td>${player.lp || 0}</td>
            `;
            rankingBody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        alert('Erro ao carregar o ranking. Por favor, tente novamente mais tarde.');
    }
}

// Carregar o ranking quando a página carregar
document.addEventListener('DOMContentLoaded', loadRanking); 