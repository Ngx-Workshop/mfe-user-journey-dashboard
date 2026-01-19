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
      requiredVersion: '21.1.0',
    },
    '@angular/common': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '21.1.0',
    },
    '@angular/router': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '21.1.0',
    },
    '@angular/forms': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '21.1.0',
    },

    '@angular/common/http': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '21.1.0',
    },

    // If you use Material/CDK, share them too
    '@angular/cdk': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '21.1.0',
    },
    '@angular/material': {
      singleton: true,
      strictVersion: true,
      requiredVersion: '21.1.0',
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
      requiredVersion: '^21.0.4',
    },
  },
});
