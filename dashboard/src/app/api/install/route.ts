import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST() {
  return new Promise((resolve) => {
    // Roda o install.sh que está na raiz do repositorio
    const scriptPath = path.resolve(process.cwd(), '../install.sh');
    
    // Executa em shell, fazendo stream do stdout e stderr se precisasse, mas vamos capturar pra enviar de volta
    exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        resolve(NextResponse.json({ success: false, log: stderr || error.message }, { status: 500 }));
        return;
      }
      
      resolve(NextResponse.json({ success: true, log: stdout }));
    });
  });
}
