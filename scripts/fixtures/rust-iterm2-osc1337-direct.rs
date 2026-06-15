use std::env;
use std::fs;
use std::io::{self, Write};

const ESC: u8 = 0x1b;
const BEL: u8 = 0x07;
const WIDTH: usize = 64;
const HEIGHT: usize = 64;
const COLUMNS: usize = 16;

const BASE64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

struct Args {
    capture: Option<String>,
    png: Option<String>,
}

fn parse_args() -> Result<Args, String> {
    let mut args = Args {
        capture: None,
        png: None,
    };

    for arg in env::args().skip(1) {
        if let Some(path) = arg.strip_prefix("--capture=") {
            args.capture = Some(path.to_string());
        } else if let Some(path) = arg.strip_prefix("--png=") {
            args.png = Some(path.to_string());
        } else if arg == "--help" {
            println!("usage: rust-iterm2-osc1337-direct [--capture=<path>] [--png=<path>]");
            std::process::exit(0);
        } else {
            return Err(format!("unknown argument: {arg}"));
        }
    }

    Ok(args)
}

fn make_rgba_image() -> Vec<u8> {
    let mut rgba = vec![0; WIDTH * HEIGHT * 4];

    for y in 0..HEIGHT {
        for x in 0..WIDTH {
            let offset = (y * WIDTH + x) * 4;
            let color = if x < WIDTH / 2 && y < HEIGHT / 2 {
                [255, 0, 0]
            } else if x >= WIDTH / 2 && y < HEIGHT / 2 {
                [0, 255, 0]
            } else if x < WIDTH / 2 {
                [0, 0, 255]
            } else {
                [255, 255, 255]
            };

            rgba[offset] = color[0];
            rgba[offset + 1] = color[1];
            rgba[offset + 2] = color[2];
            rgba[offset + 3] = 255;
        }
    }

    rgba
}

fn crc32(bytes: &[u8]) -> u32 {
    let mut crc = 0xffff_ffffu32;

    for byte in bytes {
        crc ^= u32::from(*byte);
        for _ in 0..8 {
            crc = (crc >> 1) ^ (0xedb8_8320 & (0u32.wrapping_sub(crc & 1)));
        }
    }

    crc ^ 0xffff_ffff
}

fn adler32(bytes: &[u8]) -> u32 {
    const MOD: u32 = 65_521;
    let mut a = 1u32;
    let mut b = 0u32;

    for byte in bytes {
        a = (a + u32::from(*byte)) % MOD;
        b = (b + a) % MOD;
    }

    (b << 16) | a
}

fn png_chunk(kind: &[u8; 4], data: &[u8]) -> Vec<u8> {
    let mut chunk = Vec::with_capacity(12 + data.len());
    chunk.extend_from_slice(&(data.len() as u32).to_be_bytes());
    chunk.extend_from_slice(kind);
    chunk.extend_from_slice(data);

    let mut crc_data = Vec::with_capacity(4 + data.len());
    crc_data.extend_from_slice(kind);
    crc_data.extend_from_slice(data);
    chunk.extend_from_slice(&crc32(&crc_data).to_be_bytes());

    chunk
}

fn zlib_store(data: &[u8]) -> Vec<u8> {
    let mut output = Vec::with_capacity(data.len() + 16 + (data.len() / 65_535) * 5);
    output.extend_from_slice(&[0x78, 0x01]);

    for (index, chunk) in data.chunks(65_535).enumerate() {
        let is_last = (index + 1) * 65_535 >= data.len();
        output.push(if is_last { 0x01 } else { 0x00 });
        let len = chunk.len() as u16;
        output.extend_from_slice(&len.to_le_bytes());
        output.extend_from_slice(&(!len).to_le_bytes());
        output.extend_from_slice(chunk);
    }

    output.extend_from_slice(&adler32(data).to_be_bytes());
    output
}

fn make_png(rgba: &[u8]) -> Vec<u8> {
    let mut ihdr = Vec::with_capacity(13);
    ihdr.extend_from_slice(&(WIDTH as u32).to_be_bytes());
    ihdr.extend_from_slice(&(HEIGHT as u32).to_be_bytes());
    ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);

    let stride = WIDTH * 4;
    let mut scanlines = vec![0; (stride + 1) * HEIGHT];
    for y in 0..HEIGHT {
        let scanline_offset = y * (stride + 1);
        scanlines[scanline_offset] = 0;
        scanlines[(scanline_offset + 1)..(scanline_offset + 1 + stride)]
            .copy_from_slice(&rgba[(y * stride)..((y + 1) * stride)]);
    }

    let mut png = Vec::new();
    png.extend_from_slice(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]);
    png.extend_from_slice(&png_chunk(b"IHDR", &ihdr));
    png.extend_from_slice(&png_chunk(b"IDAT", &zlib_store(&scanlines)));
    png.extend_from_slice(&png_chunk(b"IEND", &[]));

    png
}

fn encode_base64(bytes: &[u8]) -> String {
    let mut encoded = String::with_capacity(bytes.len().div_ceil(3) * 4);

    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);

        encoded.push(BASE64[(b0 >> 2) as usize] as char);
        encoded.push(BASE64[(((b0 & 0b0000_0011) << 4) | (b1 >> 4)) as usize] as char);

        if chunk.len() > 1 {
            encoded.push(BASE64[(((b1 & 0b0000_1111) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            encoded.push('=');
        }

        if chunk.len() > 2 {
            encoded.push(BASE64[(b2 & 0b0011_1111) as usize] as char);
        } else {
            encoded.push('=');
        }
    }

    encoded
}

fn make_osc1337_output(png: &[u8]) -> Vec<u8> {
    let encoded = encode_base64(png);
    let header = format!(
        "\x1b]1337;File=name=dGVybXBsb3QtaXRlcm0yLXByb29mLnBuZw==;size={};inline=1;width={};preserveAspectRatio=1:",
        png.len(),
        COLUMNS
    );
    let mut output = Vec::with_capacity(header.len() + encoded.len() + 2);
    output.extend_from_slice(header.as_bytes());
    output.extend_from_slice(encoded.as_bytes());
    output.push(BEL);
    output.push(b'\n');
    output
}

fn assert_osc1337_output(output: &[u8]) -> Result<(), String> {
    let text = String::from_utf8_lossy(output);

    if !text.contains("\x1b]1337;File=") {
        return Err("output does not contain iTerm2 OSC 1337 File= sequence".to_string());
    }

    if !text.contains("inline=1") {
        return Err("output does not contain inline=1".to_string());
    }

    if output.windows(3).any(|window| window == [ESC, b'_', b'G']) {
        return Err("output unexpectedly contains Kitty APC data".to_string());
    }

    Ok(())
}

fn run() -> Result<(), String> {
    let args = parse_args()?;
    let png = make_png(&make_rgba_image());
    let output = make_osc1337_output(&png);

    assert_osc1337_output(&output)?;

    if let Some(path) = args.png {
        fs::write(path, &png).map_err(|error| format!("failed to write png: {error}"))?;
    }

    if let Some(path) = args.capture {
        fs::write(path, &output).map_err(|error| format!("failed to write capture: {error}"))?;
    }

    io::stdout()
        .write_all(&output)
        .map_err(|error| format!("failed to write stdout: {error}"))?;
    eprintln!("rust_iterm2_fixture=direct");
    eprintln!("rust_iterm2_protocol=osc1337");
    eprintln!("rust_iterm2_png_size={WIDTH}x{HEIGHT}");
    eprintln!("rust_iterm2_png_bytes={}", png.len());
    eprintln!("rust_iterm2_output_bytes={}", output.len());

    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}
