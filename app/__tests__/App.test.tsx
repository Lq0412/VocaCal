/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-calendars', () => {
  const MockReact = require('react');
  const {View} = require('react-native');

  return {
    Calendar: (props: object) => MockReact.createElement(View, props),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const MockReact = require('react');
  const {View} = require('react-native');

  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      MockReact.createElement(View, null, children),
    SafeAreaView: ({children, style}: {children: React.ReactNode; style: object}) =>
      MockReact.createElement(View, {style}, children),
  };
});

test('renders VocaCal calendar shell', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const titleNodes = renderer!.root
    .findAllByProps({testID: 'app-title'})
    .filter(node => node.props.children === 'VocaCal');

  expect(titleNodes.length).toBeGreaterThan(0);
  expect(titleNodes[0].props.children).toBe('VocaCal');
});
