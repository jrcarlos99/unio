# UNIO Agente de IA

Servico independente responsavel pela recomendacao de startups e investidores.

## Responsabilidades

- Receber dados ja filtrados pelo back-end Java.
- Preparar o contexto e montar o prompt.
- Consultar a OpenAI.
- Validar o JSON retornado.
- Aceitar somente candidatos enviados pelo back-end.
- Devolver compatibilidade, resumo, pontos fortes e pontos de atencao.

O agente nao acessa o PostgreSQL e nao conhece credenciais de usuarios. O back-end
continua responsavel por autenticacao, perfis, banco e cache.

## Execucao local

```powershell
cd agente-ia
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:OPENAI_API_KEY = "sua-chave-da-openai"
uvicorn app.main:app --reload --port 8000
```

Para hospedagem com Docker, use o `Dockerfile` desta pasta. O processo escuta
em `0.0.0.0` e usa a variável `PORT` fornecida pela plataforma.

Endpoints:

- `GET /health`
- `POST /v1/recommendations`

O back-end Java deve usar `AGENTE_IA_URL=http://localhost:8000`.
Nunca coloque a chave da OpenAI no front-end, no Java ou em arquivos versionados.
