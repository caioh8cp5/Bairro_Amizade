// Usa o google-services.json (necessário para notificações push no Android)
// somente quando o arquivo existir, para o projeto continuar rodando sem ele.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
