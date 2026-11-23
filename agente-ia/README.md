# UNIO Agente de IA

Serviço independente de recomendação de startups e investidores.

## Responsabilidades

- Receber perfil, onboarding relevante e candidatos preparados pelo backend Java.
- Consultar a OpenAI para obter notas e justificativas por critério.
- Validar a estrutura e os IDs retornados.
- Aplicar a fórmula ponderada, calcular cobertura, classificar e ordenar candidatos.
- Devolver resumo, fatores, pontos fortes, pontos de atenção e perfil público usado pelas telas.
- Reutilizar resultados idênticos por até cinco minutos; qualquer mudança nos dados de entrada cria outra chave de cache.

O agente não acessa o PostgreSQL. Java continua responsável pela autenticação, perfis, dados e estado de salvar/interesse. O frontend apresenta a mesma resposta do agente nos cards e no perfil.

## Execução local

```powershell
cd agente-ia
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:OPENAI_API_KEY = "sua-chave-da-openai"
uvicorn app.main:app --reload --port 8000
```

Para Docker, use o `Dockerfile` desta pasta. A aplicação escuta em `0.0.0.0` e usa `PORT` quando fornecido pela plataforma.

Endpoints:

- `GET /health`
- `POST /v1/recommendations`

O backend Java usa `agente-ia.url` (padrão local `http://localhost:8000`). Nunca coloque a chave OpenAI no front-end, no Java ou em arquivos versionados.

## Modelo e avaliação

Pesos, fórmula, dados, arquitetura, critérios de validação, limitações e roteiro de apresentação estão em [docs/validacao-recomendacoes.md](docs/validacao-recomendacoes.md).

Configuração: `OPENAI_API_KEY`; opcionais `OPENAI_MODEL` (padrão `gpt-4o-mini`), `OPENAI_TIMEOUT_SECONDS` (35) e `RECOMMENDATION_CACHE_TTL_SECONDS` (300).
