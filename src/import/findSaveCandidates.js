const normalizePath = (file) => (file.webkitRelativePath || file.name || '').replaceAll('\\', '/');

export function findLevelSaveCandidates(files) {
  const entries = Array.from(files || []).map((file) => {
    const relativePath = normalizePath(file);
    const parts = relativePath.split('/').filter(Boolean);
    return { file, relativePath, parts, lowerPath: relativePath.toLocaleLowerCase('en-US') };
  }).filter(({ parts }) => !parts.some((part) => part.toLocaleLowerCase('en-US') === 'backup'));
  const byPath = new Map(entries.map((entry) => [entry.lowerPath, entry]));

  return entries
    .filter(({ file }) => file.name.toLocaleLowerCase('en-US') === 'level.sav')
    .map(({ file, relativePath, parts }) => {
      const worldParts = parts.slice(0, -1);
      const worldPath = worldParts.join('/');
      const child = (name) => byPath.get(`${worldPath}/${name}`.toLocaleLowerCase('en-US'))?.file || null;
      const playersPrefix = `${worldPath}/players/`.toLocaleLowerCase('en-US');
      const playerEntries = entries.filter(({ lowerPath }) => lowerPath.startsWith(playersPrefix));
      return {
        file,
        levelFile: file,
        metaFile: child('LevelMeta.sav'),
        optionFile: child('WorldOption.sav'),
        playerFiles: playerEntries
          .filter(({ file: playerFile }) => /^[0-9a-f]{32}\.sav$/i.test(playerFile.name))
          .map(({ file: playerFile, relativePath: playerPath }) => ({ file: playerFile, relativePath: playerPath })),
        dimensionalFiles: playerEntries
          .filter(({ file: playerFile }) => /^[0-9a-f]{32}_dps\.sav$/i.test(playerFile.name))
          .map(({ file: playerFile, relativePath: playerPath }) => ({ file: playerFile, relativePath: playerPath })),
        relativePath,
        worldPath,
        worldId: worldParts.at(-1) || 'selected-world',
        worldName: worldParts.at(-1) || 'Mundo seleccionado',
        lastModified: file.lastModified || 0,
      };
    })
    .sort((a, b) => b.lastModified - a.lastModified || a.relativePath.localeCompare(b.relativePath));
}
