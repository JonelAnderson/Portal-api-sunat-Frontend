import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  // Mismo origen: el nginx que sirva el panel reenvía /api a la API SUNAT. Sin CORS y sin URL fija por servidor.
  apiUrl: '/api/',
  isTestEnvironment: false
};
