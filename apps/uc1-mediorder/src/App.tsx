import { currentRoute } from './router';
import { Header } from './components/Header';
import { ScannerScreen } from './screens/Scanner';
import { PlanScreen } from './screens/Plan';
import { OrderScreen } from './screens/Order';
import { HistoryScreen } from './screens/History';
import { SettingsScreen } from './screens/Settings';

export function App() {
  const route = currentRoute.value;

  let screen;
  switch (route?.route) {
    case '/':
      screen = <ScannerScreen />;
      break;
    case '/plan/:id':
      screen = <PlanScreen id={Number(route.params.id)} />;
      break;
    case '/order/:id':
      screen = <OrderScreen id={Number(route.params.id)} />;
      break;
    case '/history':
      screen = <HistoryScreen />;
      break;
    case '/settings':
      screen = <SettingsScreen />;
      break;
    default:
      screen = <ScannerScreen />;
  }

  return (
    <>
      <Header />
      {screen}
    </>
  );
}
