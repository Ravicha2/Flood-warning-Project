/**
 * Web stub for @react-navigation/drawer.
 * Used when building for web so the bundle resolves; the app uses Tabs on web via _layout.web.tsx.
 */
const React = require('react');
const { View } = require('react-native');

function createDrawerNavigator() {
  const Navigator = (props) => {
    const { children } = props;
    return React.createElement(View, { style: { flex: 1 } }, children);
  };
  Navigator.Screen = () => null;
  return { Navigator };
}

module.exports = {
  createDrawerNavigator,
  default: createDrawerNavigator,
};
