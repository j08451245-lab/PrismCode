// Where PrismCode lives. Builds are published on GitHub Releases; until a release is
// cut, the repository is the only place to get the app.
const repoUrl = 'https://github.com/j08451245-lab/PrismCode';

export const project = {
  repo: repoUrl,
  clone: `${repoUrl}.git`,
  releases: `${repoUrl}/releases`,
  issues: `${repoUrl}/issues`,
  security: `${repoUrl}/security/policy`,
};

export const distribution = {
  platforms: 'macOS · Windows · Linux',
  isUnsignedPreview: true,
  requirements: 'Apple silicon or Intel · macOS 12+',
  previewNotice: 'Not notarized by Apple. macOS may block the first launch.',
  appleSupportUrl: 'https://support.apple.com/en-us/102445',
};
