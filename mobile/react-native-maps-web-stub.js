/**
 * Web stub for react-native-maps. The real package is native-only and breaks the web bundle.
 * This file is used when building for web (see metro.config.js).
 */
const React = require('react');
const { View, Text } = require('react-native');

function MapViewStub(props) {
  return React.createElement(
    View,
    { style: [{ flex: 1 }, props.style] },
    React.createElement(Text, { style: { padding: 24 } }, 'Map (use iOS/Android app for full map)')
  );
}

function PolygonStub() {
  return null;
}

function CircleStub() {
  return null;
}

module.exports = MapViewStub;
module.exports.Polygon = PolygonStub;
module.exports.Circle = CircleStub;
module.exports.PROVIDER_DEFAULT = null;
