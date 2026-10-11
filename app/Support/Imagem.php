<?php

namespace App\Support;

use GdImage;
use RuntimeException;

/**
 * Tratamento de fotos com a extensão GD do PHP: abrir JPG/PNG/WebP, endireitar as fotos
 * tiradas no telemóvel (orientação EXIF), reduzir e gravar em WebP.
 */
final class Imagem
{
    /** Acima disto (em píxeis) a foto não é aceite: abri-la gastaria demasiada memória */
    public const MAXIMO_PIXEIS = 40_000_000;

    /** Abre a imagem já na posição certa. Lança RuntimeException se não for uma imagem válida. */
    public static function abrir(string $caminho): GdImage
    {
        $info = @getimagesize($caminho);
        if ($info === false) {
            throw new RuntimeException('O ficheiro não é uma imagem válida.');
        }
        [$largura, $altura, $tipo] = $info;
        if ($largura * $altura > self::MAXIMO_PIXEIS) {
            throw new RuntimeException('A imagem é demasiado grande (mais de 40 megapíxeis).');
        }

        $imagem = match ($tipo) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($caminho),
            IMAGETYPE_PNG => @imagecreatefrompng($caminho),
            IMAGETYPE_WEBP => @imagecreatefromwebp($caminho),
            default => throw new RuntimeException('Formato não suportado. Use JPG, PNG ou WebP.'),
        };
        if (! $imagem instanceof GdImage) {
            throw new RuntimeException('Não foi possível ler a imagem (ficheiro danificado?).');
        }
        if (! imageistruecolor($imagem)) {
            imagepalettetotruecolor($imagem);
        }

        return $tipo === IMAGETYPE_JPEG ? self::endireitar($imagem, $caminho) : $imagem;
    }

    /** Reduz para caber num quadrado de $maximo píxeis; as imagens mais pequenas ficam como estão. */
    public static function reduzir(GdImage $imagem, int $maximo): GdImage
    {
        $largura = imagesx($imagem);
        $altura = imagesy($imagem);
        if ($largura <= $maximo && $altura <= $maximo) {
            return $imagem;
        }

        $escala = $maximo / max($largura, $altura);
        $novaLargura = max(1, (int) round($largura * $escala));
        $novaAltura = max(1, (int) round($altura * $escala));

        $nova = imagecreatetruecolor($novaLargura, $novaAltura);
        // Mantém a transparência dos PNG e WebP
        imagealphablending($nova, false);
        imagesavealpha($nova, true);
        imagefill($nova, 0, 0, imagecolorallocatealpha($nova, 0, 0, 0, 127));
        imagecopyresampled($nova, $imagem, 0, 0, 0, 0, $novaLargura, $novaAltura, $largura, $altura);

        return $nova;
    }

    /** Conteúdo da imagem em WebP */
    public static function webp(GdImage $imagem, int $qualidade = 82): string
    {
        imagesavealpha($imagem, true);
        $fluxo = fopen('php://memory', 'w+b');
        if (! imagewebp($imagem, $fluxo, $qualidade)) {
            throw new RuntimeException('Não foi possível converter a imagem.');
        }
        rewind($fluxo);
        $conteudo = (string) stream_get_contents($fluxo);
        fclose($fluxo);

        return $conteudo;
    }

    /**
     * As câmaras guardam a foto "deitada" e indicam no EXIF como a rodar.
     * Aplica essa rotação, para a foto não aparecer de lado no site.
     */
    private static function endireitar(GdImage $imagem, string $caminho): GdImage
    {
        $orientacao = function_exists('exif_read_data') ? (int) (@exif_read_data($caminho)['Orientation'] ?? 1) : 1;

        // O GD roda no sentido contrário ao dos ponteiros do relógio
        $rodar = match ($orientacao) {
            3 => 180,
            5, 6 => -90,
            7, 8 => 90,
            default => 0,
        };
        if ($rodar !== 0) {
            $imagem = imagerotate($imagem, $rodar, 0) ?: $imagem;
        }
        match ($orientacao) {
            2, 5, 7 => imageflip($imagem, IMG_FLIP_HORIZONTAL),
            4 => imageflip($imagem, IMG_FLIP_VERTICAL),
            default => null,
        };

        return $imagem;
    }
}
