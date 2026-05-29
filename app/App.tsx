import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CalendarScreen } from './src/screens/CalendarScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fb" />
      <CalendarScreen />
    </SafeAreaProvider>
  );
}

export default App;
