import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/context/LanguageContext';
import { ChildProfileProvider } from './src/context/ChildProfileContext';
import { PhysicalActivityProvider } from './src/context/PhysicalActivityContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ChildProfileProvider>
          <PhysicalActivityProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </PhysicalActivityProvider>
        </ChildProfileProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
