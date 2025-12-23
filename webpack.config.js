const {
  shareAll,
  withModuleFederationPlugin,
} = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  name: 'ngx-seed-mfe',
  filename: 'remoteEntry.js',

  exposes: {
    './Component': './src/app/app.ts',
    './Routes': './src/app/app.routes.ts',
  },

  shared: {
    '@angular/core': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '20.1.6',
    },
    '@angular/common': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '20.1.6',
    },
    '@angular/router': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '20.1.6',
    },
    '@angular/forms': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '20.1.6',
    },
    '@angular/common/http': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '20.1.6',
    },

    // If you use Material/CDK, share them too
    '@angular/cdk': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '20.1.5',
    },
    '@angular/material': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '20.1.5',
    },

    // RxJS + tslib
    rxjs: {
      singleton: true,
      strictVersion: true,
      requiredVersion: '7.8.2',
    },
    tslib: {
      singleton: true,
      strictVersion: true,
      requiredVersion: '2.8.1',
    },

    // Metadata service
    '@tmdjr/ngx-user-metadata': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '^0.0.9',
    },
  },
});
