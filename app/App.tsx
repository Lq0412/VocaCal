import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CalendarScreen } from './src/screens/CalendarScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F5F2" />
      <CalendarScreen />
    </SafeAreaProvider>
  );
}

export default App;
