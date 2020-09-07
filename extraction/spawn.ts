import { spawn as fsSpawn, SpawnOptionsWithoutStdio } from 'child_process';

export const spawn = (cmd: string, pts?: string[], extra?: SpawnOptionsWithoutStdio) =>
  new Promise((res, rej) => {
    const prog = fsSpawn(cmd, pts || [], {
      stdio: [process.stdin, process.stdout, process.stderr],
      ...(extra || {}),
    });
    prog.on('error', rej);
    prog.on('exit', res);
  });
