import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseProvider } from './src/database/DatabaseContext';
import { theme } from './src/utils/theme';

const App = () => {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <DatabaseProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </DatabaseProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;

