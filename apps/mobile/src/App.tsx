import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AnimatePresence } from 'framer-motion';

import { Tutorial } from './pages/Tutorial';
import { Dashboard } from './pages/Dashboard';
import { Capture } from './pages/Capture';
import { Analyze } from './pages/Analyze';
import { Results } from './pages/Results';
import { Vault } from './pages/Vault';
import { SessionProvider, useSession } from './context/SessionContext';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const RouterConfig: React.FC = () => {
  const { state } = useSession();

  return (
    <IonReactRouter>
      <IonRouterOutlet animated={false}>
        <Route exact path="/tutorial">
          <Tutorial />
        </Route>
        <Route exact path="/dashboard">
          <Dashboard />
        </Route>
        <Route exact path="/capture">
          <Capture />
        </Route>
        <Route exact path="/analyze">
          <Analyze />
        </Route>
        <Route exact path="/results">
          <Results />
        </Route>
        <Route exact path="/vault">
          <Vault />
        </Route>
        <Route exact path="/">
          <Redirect to={state.isTutorialComplete ? '/dashboard' : '/tutorial'} />
        </Route>
        {/* Catch-all for old URLs like /home */}
        <Route>
          <Redirect to="/" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  );
};

const App: React.FC = () => (
  <IonApp>
    <SessionProvider>
      <RouterConfig />
    </SessionProvider>
  </IonApp>
);

export default App;
