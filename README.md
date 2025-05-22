# 🧠 Projeto Estudo Pesquisa LOL

Este projeto utiliza a **Riot Games API** para coletar dados de jogadores ranqueados e os armazena em um banco de dados **Supabase**.

## 🚀 Tecnologias
- ⚙️ Node.js  
- 🗃️ Supabase  
- 🛡️ Riot Games API  
- 💻 HTML, CSS e JavaScript

## 🛠️ Como rodar
1. **Clone o repositório**:
```bash
git clone <url-do-repo>
cd api-lol
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Crie o arquivo `.env`** com as seguintes variáveis:
```env
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_KEY=<sua-chave>
RIOT_API_KEY=<sua-chave-da-riot>
```

4. **Inicie o servidor**:
```bash
node server.js
```

## 🧾 Estrutura do banco de dados (Supabase)

**Tabela:** `ranked_players`

| 🏷️ Campo          | 🔠 Tipo     |
|-------------------|------------|
| `id`              | `int8`     |
| `summoner_name`   | `text`     |
| `tier`            | `text`     |
| `rank`            | `text`     |
| `lp`              | `int4`     |
| `tier_value`      | `int4`     |
| `created_at`      | `timestamp`|
| `profile_icon_id` | `int4`     |


---

✨ Simples, funcional e pronto para subir no Nexus! 🧬
