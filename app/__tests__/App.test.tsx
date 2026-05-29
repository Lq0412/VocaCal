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

jest.mock('../src/services/storageService', () => ({
  getEventsByDate: jest.fn(() => Promise.resolve([])),
  initDatabase: jest.fn(() => Promise.resolve()),
}));

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

test('shows empty state when selected date has no stored events', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const emptyNodes = renderer!.root
    .findAllByProps({testID: 'empty-events-title'})
    .filter(node => node.props.children === '暂无日程');

  expect(emptyNodes.length).toBeGreaterThan(0);
});
