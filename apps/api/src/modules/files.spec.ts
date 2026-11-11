import { validateUpload } from './files.controller.js';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3]);

describe('Validação de upload (E11-1)', () => {
  it('aceita PNG verdadeiro e devolve o MIME validado (não o enviado pelo navegador)', () => {
    expect(validateUpload('logo.PNG', png)).toEqual({ ext: 'png', mime: 'image/png', inline: true });
  });

  it('recusa executável renomeado para .png', () => {
    expect(() => validateUpload('foto.png', exe)).toThrow('não corresponde à extensão');
  });

  it('recusa executável disfarçado de texto e extensões bloqueadas', () => {
    expect(() => validateUpload('leia.txt', exe)).toThrow('não corresponde');
    expect(() => validateUpload('instalador.exe', exe)).toThrow('não permitido');
    expect(() => validateUpload('pagina.html', Buffer.from('<html>'))).toThrow('não permitido');
    expect(() => validateUpload('semextensao', png)).toThrow('não permitido');
  });

  it('SVG é aceito, mas nunca exibido inline', () => {
    expect(validateUpload('icone.svg', Buffer.from('<svg/>')).inline).toBe(false);
  });

  it('recusa acima do limite do tipo com mensagem específica', () => {
    const big = Buffer.alloc(26 * 1024 * 1024);
    png.copy(big);
    expect(() => validateUpload('grande.png', big)).toThrow('no máximo 25 MB');
  });
});
