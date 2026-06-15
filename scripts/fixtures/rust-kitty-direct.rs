use std::env;
use std::fs;
use std::io::{self, Write};

const ESC: u8 = 0x1b;
const WIDTH: usize = 64;
const HEIGHT: usize = 64;
const COLUMNS: usize = 16;
const ROWS: usize = 16;
const CHUNK_SIZE: usize = 4096;

const BASE64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn parse_capture_path() -> Result<Option<String>, String> {
    let mut capture = None;

    for arg in env::args().skip(1) {
        if let Some(path) = arg.strip_prefix("--capture=") {
            capture = Some(path.to_string());
        } else if arg == "--help" {
            println!("usage: rust-kitty-direct [--capture=<path>]");
            std::process::exit(0);
        } else {
            return Err(format!("unknown argument: {arg}"));
        }
    }

    Ok(capture)
}

fn make_rgb_image() -> Vec<u8> {
    let mut rgb = vec![0; WIDTH * HEIGHT * 3];

    for y in 0..HEIGHT {
        for x in 0..WIDTH {
            let offset = (y * WIDTH + x) * 3;
            let color = if x < WIDTH / 2 && y < HEIGHT / 2 {
                [255, 0, 0]
            } else if x >= WIDTH / 2 && y < HEIGHT / 2 {
                [0, 255, 0]
            } else if x < WIDTH / 2 {
                [0, 0, 255]
            } else {
                [255, 255, 255]
            };

            rgb[offset] = color[0];
            rgb[offset + 1] = color[1];
            rgb[offset + 2] = color[2];
        }
    }

    rgb
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

fn make_kitty_output(rgb: &[u8]) -> Vec<u8> {
    let encoded = encode_base64(rgb);
    let chunks: Vec<&str> = encoded
        .as_bytes()
        .chunks(CHUNK_SIZE)
        .map(|chunk| std::str::from_utf8(chunk).expect("base64 is utf8"))
        .collect();
    let mut output = Vec::new();

    for (index, chunk) in chunks.iter().enumerate() {
        let is_first = index == 0;
        let is_last = index == chunks.len() - 1;
        let metadata = if is_first {
            format!(
                "a=T,f=24,s={WIDTH},v={HEIGHT},c={COLUMNS},r={ROWS},q=2,m={}",
                if is_last { 0 } else { 1 }
            )
        } else {
            format!("q=2,m={}", if is_last { 0 } else { 1 })
        };

        output.push(ESC);
        output.extend_from_slice(b"_G");
        output.extend_from_slice(metadata.as_bytes());
        output.push(b';');
        output.extend_from_slice(chunk.as_bytes());
        output.push(ESC);
        output.push(b'\\');
    }

    output.push(b'\n');
    output
}

fn assert_kitty_output(output: &[u8]) -> Result<(), String> {
    let text = String::from_utf8_lossy(output);

    if !output.windows(3).any(|window| window == [ESC, b'_', b'G']) {
        return Err("output does not contain Kitty APC ESC_G sequence".to_string());
    }

    if !output.windows(2).any(|window| window == [ESC, b'\\']) {
        return Err("output does not contain Kitty APC string terminator".to_string());
    }

    if text.contains("File=") {
        return Err("output unexpectedly contains iTerm2 OSC 1337 File= data".to_string());
    }

    if !text.contains("f=24") || !text.contains("s=64") || !text.contains("v=64") {
        return Err("output is missing expected raw RGB Kitty metadata".to_string());
    }

    Ok(())
}

fn run() -> Result<(), String> {
    let capture = parse_capture_path()?;
    let rgb = make_rgb_image();
    let output = make_kitty_output(&rgb);

    assert_kitty_output(&output)?;

    if let Some(path) = capture {
        fs::write(path, &output).map_err(|error| format!("failed to write capture: {error}"))?;
    }

    io::stdout()
        .write_all(&output)
        .map_err(|error| format!("failed to write stdout: {error}"))?;
    eprintln!("rust_kitty_fixture=direct");
    eprintln!("rust_kitty_protocol=kitty");
    eprintln!("rust_kitty_format=rgb24");
    eprintln!("rust_kitty_size={WIDTH}x{HEIGHT}");
    eprintln!("rust_kitty_cells={COLUMNS}x{ROWS}");
    eprintln!("rust_kitty_bytes={}", output.len());

    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}
