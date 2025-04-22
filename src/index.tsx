import * as React from 'react';
import { Link } from 'react-router-dom';
import type { PiletApi } from 'micro-web-template';
import { useGlobalState } from 'piral';
import './i18n';
const Page = React.lazy(() => import('./Page'));

export function setup(app: PiletApi) {
  app.registerPage('/dataHub/load-data', Page);

  app.showNotification('Hello from Piral!', {
    autoClose: 2000,
  });
  app.registerMenu(() => <Link to="/dashboard">Dashboard頁面</Link>);
  app.registerTile(() => <div>Welcome to Piral!</div>, {
    initialColumns: 2,
    initialRows: 2,
  });
}
