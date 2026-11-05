# Limpsol — Render + Hostinger

Projeto preparado a partir de `bkp/`, preservada como referência original. O backend Express fica no Render; o frontend HTML/CSS/JS fica na hospedagem de arquivos da Hostinger. Não é necessário compilar o frontend.

## Estrutura

- `backend/`: API Node.js 24, MySQL e testes.
- `frontend/`: únicos arquivos a enviar para `public_html`.
- `firmware/limpsol/`: adaptação HTTPS do protótipo ESP32 original.
- `render.yaml`: Blueprint do backend.
- `bkp/`: original; não enviar para a hospedagem.

## 1. Preparar o MySQL

Crie um banco MySQL e um usuário com acesso a ele. Render não fornece um MySQL gerenciado neste Blueprint: utilize um banco externo acessível a partir do serviço.

Se utilizar MySQL da Hostinger, abra **Remote MySQL** no hPanel e autorize as origens de conexão do Render. Use o hostname remoto indicado no painel, nunca `localhost`. Consulte os intervalos de saída do seu serviço no Render; a conexão pode usar qualquer IP desses intervalos. Se o painel não aceitar intervalos, confirme com o provedor como autorizar o conjunto necessário, sem presumir um único IP fixo.

Importe `backend/database/schema.sql` no banco selecionado pelo phpMyAdmin. Alternativamente, configure `backend/.env` e execute:

```powershell
cd backend
npm ci
npm run db:init
```

O script cria tabelas ausentes sem apagar registros; ele não transforma tabelas legadas com estruturas diferentes. Compare o esquema antes de reutilizar um banco antigo. Para bancos já existentes, confira se `sensorReadings` possui um índice em `recordedAt`; o esquema inclui esse índice nas novas tabelas.

Configure TLS de acordo com o provedor. `DB_SSL=true` valida o certificado; `DB_SSL_CA` permite uma CA específica em PEM, com quebras reais ou `\n`. O Blueprint habilita TLS. Se o plano MySQL não oferecer TLS, prefira um banco que ofereça; `DB_SSL=false` existe para ambientes sem TLS e desenvolvimento, mas transmite a conexão sem essa proteção.

Referências: [MySQL remoto na Hostinger](https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/) e [IPs de saída do Render](https://render.com/docs/outbound-ip-addresses).

## 2. Publicar o backend no Render

Envie as alterações ao seu repositório Git. No Render, crie um Blueprint usando o `render.yaml` da raiz, ou configure um **Web Service** manualmente:

| Campo | Valor |
| --- | --- |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Instâncias | 1 |

Escolha o plano na criação do serviço. A aplicação escuta em `0.0.0.0` e usa a variável `PORT` fornecida pelo Render. Não precisa configurar uma porta fixa.

Preencha as variáveis de ambiente no Render:

| Variável | Conteúdo |
| --- | --- |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Origem HTTPS da Hostinger, sem barra final ou caminho, por exemplo `https://limpsol.com.br` |
| `DB_HOST` | Hostname remoto do MySQL |
| `DB_PORT` | Porta do MySQL, normalmente `3306` |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciais e nome do banco |
| `DB_SSL` | `true` para TLS; conforme o provedor |
| `DB_SSL_CA` | Opcional: certificado CA exigido pelo provedor |
| `ADMIN_API_KEY` | Chave privada do operador, aleatória, com pelo menos 32 caracteres |
| `DEVICE_API_KEY` | Outra chave privada para o ESP32, com pelo menos 32 caracteres |

Para gerar cada chave localmente:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use chaves diferentes. Não publique chaves, senhas, `.env` ou `config.h` no Git ou no frontend. Se o site responder com e sem `www`, informe ambas as origens separadas por vírgula em `FRONTEND_URL`.

O banco e as tabelas precisam estar prontos antes do primeiro início. Acesse `https://SEU-SERVICO.onrender.com/health`: deve retornar HTTP 200 e `{"status":"ok"}`. HTTP 503 indica indisponibilidade do banco. Os endpoints `/api/*` exigem `Authorization: Bearer CHAVE`; o heartbeat usa a chave do dispositivo e os demais usam a chave do operador. CORS restringe o navegador; a autenticação também protege acessos fora dele.

Referência: [Web Services do Render](https://render.com/docs/web-services).

## 3. Publicar o frontend na Hostinger

1. Em `frontend/js/config.js`, substitua `https://SEU-SERVICO.onrender.com/api` pela URL real da API, mantendo `/api`.
2. No hPanel, utilize um site de hospedagem de arquivos/HTML e abra seu gerenciador de arquivos.
3. Envie **o conteúdo de `frontend/`**, incluindo `.htaccess`, para `public_html/`. O arquivo de entrada deve ficar em `public_html/index.html`, não em `public_html/frontend/index.html`.
4. Remova a página padrão `default.php`, caso esteja exibindo a página de boas-vindas, e confirme que o SSL do domínio está ativo.
5. Abra o site via HTTPS, informe a `ADMIN_API_KEY` no campo de acesso e clique em **Conectar**.

A chave fica somente na memória da aba; será necessário informá-la novamente ao recarregar. `config.js` é público e contém apenas a URL da API. Não há `.env` de frontend nem `npm build` nesta arquitetura.

Referência: [Página padrão e public_html na Hostinger](https://www.hostinger.com/support/5811527-the-website-shows-a-you-are-all-set-to-go-message/).

## 4. Configurar o ESP32

O firmware original em `bkp/tcc.ino` aponta para a rede local e não autentica: não funcionará diretamente com esta API de produção.

1. Abra `firmware/limpsol/limpsol.ino` na Arduino IDE com suporte ESP32 e ArduinoJson 7.
2. Copie `config.example.h` para `config.h` na mesma pasta.
3. Preencha Wi-Fi, URL HTTPS terminando em `/api/heartbeat`, `DEVICE_API_KEY` e a CA raiz válida para o certificado do endpoint. Obtenha o PEM da CA junto à autoridade emissora; mantenha-o atualizado quando a cadeia mudar. Não use `setInsecure()`.
4. Compile e grave no ESP32. Aguarde conexão Wi-Fi e sincronização NTP, necessária à validação TLS.
5. Confirme no painel o ESP32 conectado e a leitura de tensão.

O firmware preserva a **simulação** de limpeza de cinco segundos existente no original. Não há controle real de motores/bomba nem parada remota implementada. O botão Stop permanece desabilitado. A nova simulação é feita sem o `delay(5000)` e sem heartbeats recursivos; chamadas HTTP ainda podem aguardar a rede. Controle de segurança de hardware deve ser executado no próprio dispositivo quando o hardware for integrado.

## Desenvolvimento e testes

```powershell
cd backend
Copy-Item .env.example .env
# Preencha as variáveis de MySQL no .env.
npm ci
npm run db:init
npm run dev
```

Em outro terminal, na raiz:

```powershell
python -m http.server 5500 --directory frontend
```

Abra `http://localhost:5500`. O `config.js` utiliza a API local nesse hostname. Para `http://127.0.0.1:5500`, adicione essa origem ao `FRONTEND_URL`. Em desenvolvimento, uma chave vazia desativa a autenticação daquele papel; em produção as duas chaves são obrigatórias.

```powershell
cd backend
npm test
```

Os testes HTTP usam um banco simulado: verificam autenticação, CORS/preflight, saúde do banco, validação do heartbeat, entrega de comando, contagem de conclusão e persistência/restauração de configuração. Não substituem o teste com MySQL remoto nem a compilação/gravação do ESP32.

## Verificação após publicar

- `/health` retorna 200; `/api/data` sem chave retorna 401.
- O painel conecta na URL HTTPS correta e mostra o estado do banco.
- A opção automática permanece salva após reiniciar o backend.
- Com ESP32 conectado, Start entrega `clean` no próximo heartbeat; a conclusão é contada uma única vez.
- Após 30 segundos sem heartbeat, o ESP32 aparece desconectado.
- Logs exibem os registros de `maintenanceLogs`, ou uma mensagem de lista vazia.

## Limites atuais do protótipo

- Utilize uma única instância: estado do dispositivo e comandos pendentes ficam em memória. Reinícios zeram o contador de limpezas da sessão e descartam comandos pendentes; a configuração automática e as leituras ficam no MySQL.
- `maintenanceLogs` é consultada, mas o protótipo ainda não produz um histórico completo de manutenção automaticamente. As tabelas de usuários e histórico não representam um sistema de login ou auditoria implementado.
- Água/tanque permanecem valores iniciais, pois o firmware original não fornece sensores reais para eles. Sujeira é uma estimativa pela tensão, calculada durante a verificação automática.
- Leituras são gravadas a cada heartbeat. Planeje retenção/arquivamento conforme a capacidade do banco.
- O plano gratuito do Render pode suspender o serviço após 15 minutos sem tráfego e demorar a responder na retomada. Durante suspensão/reinício não há automação no servidor. Para operação contínua, selecione um plano sem suspensão. Veja [limites do plano gratuito](https://render.com/docs/free).

Nenhum serviço foi publicado automaticamente. Os domínios, credenciais, banco real e configuração do dispositivo ainda precisam ser preenchidos no ambiente de destino.
