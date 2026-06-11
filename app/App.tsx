import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabNavigator } from './src/navigation/TabNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
