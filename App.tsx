import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/context/LanguageContext';
import { ChildProfileProvider } from './src/context/ChildProfileContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ChildProfileProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </ChildProfileProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
