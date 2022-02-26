/* global project, loggedUser */

import 'nwl-components/dist/style.css';
import { createApp, ref } from 'vue';
import { SettingsPage } from 'nwl-components';
import config from './nwl-components-config';

const PageContents = {
  template: `
    <SettingsPage :project="project" />
  `,
  setup() {
    const files = ref([]);

    return {
      project,
      files
    };
  }
};

const app = createApp(PageContents);
app.component('SettingsPage', SettingsPage);
app.provide('config', config);
app.provide('user', loggedUser);

app.mount('#app');
