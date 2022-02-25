export default {
  siteName: "Microdraw",
  baseURL: window.location.protocol + "//" + window.location.host,
  logoURL: "/img/microdraw-white.svg",
  githubURL: "https://github.com/neuroanatomy/microdraw",
  issuesURL: "https://github.com/neuroanatomy/microdraw/issues",
  docURL: "https://microdraw.pasteur.fr/doc/",
  userSearchURL: "/search/json/users?q=",
  // eslint-disable-next-line
  fetchLabelSets: async () => [{name: 'Set 1', source: 'set1.json'}, {name: 'Set 2', source: 'set2.json'}],
  annotationTypes: ["text", "vectorial"],
  usernameField: 'username'
};
