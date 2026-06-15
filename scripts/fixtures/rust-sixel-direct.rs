use std::env;
use std::fs;
use std::io::{self, Write};

const ESC: u8 = 0x1b;
const WIDTH: usize = 64;
const HEIGHT: usize = 64;
const COLORS: [(&str, [u8; 3], [u8; 3]); 4] = [
    ("red", [255, 0, 0], [100, 0, 0]),
    ("green", [0, 255, 0], [0, 100, 0]),
    ("blue", [0, 0, 255], [0, 0, 100]),
    ("white", [255, 255, 255], [100, 100, 100]),
];

struct Args {
    capture: Option<String>,
}

fn parse_args() -> Result<Args, String> {
    let mut args = Args { capture: None };

    for arg in env::args().skip(1) {
        if let Some(path) = arg.strip_prefix("--capture=") {
            args.capture = Some(path.to_string());
        } else if arg == "--help" {
            println!("usage: rust-sixel-direct [--capture=<path>]");
            std::process::exit(0);
        } else {
            return Err(format!("unknown argument: {arg}"));
        }
    }

    Ok(args)
}

fn color_at(x: usize, y: usize) -> usize {
    if x < WIDTH / 2 && y < HEIGHT / 2 {
        0
    } else if x >= WIDTH / 2 && y < HEIGHT / 2 {
        1
    } else if x < WIDTH / 2 {
        2
    } else {
        3
    }
}

fn make_sixel_output() -> Vec<u8> {
    let mut output = Vec::new();
    output.extend_from_slice(format!("\x1bPq\"1;1;{WIDTH};{HEIGHT}").as_bytes());

    for (index, (_, _, sixel)) in COLORS.iter().enumerate() {
        output.extend_from_slice(
            format!(
                "#{};2;{};{};{}",
                index + 1,
                sixel[0],
                sixel[1],
                sixel[2]
            )
            .as_bytes(),
        );
    }

    for y in (0..HEIGHT).step_by(6) {
        for color_index in 0..COLORS.len() {
            output.extend_from_slice(format!("#{}", color_index + 1).as_bytes());
            for x in 0..WIDTH {
                let mut bits = 0u8;
                for bit in 0..6 {
                    let py = y + bit;
                    if py < HEIGHT && color_at(x, py) == color_index {
                        bits |= 1 << bit;
                    }
                }
                output.push(63 + bits);
            }
            if color_index + 1 != COLORS.len() {
                output.push(b'$');
            }
        }
        if y + 6 < HEIGHT {
            output.push(b'-');
        }
    }

    output.extend_from_slice(b"\x1b\\\n");
    output
}

fn assert_sixel_output(output: &[u8]) -> Result<(), String> {
    if !output.starts_with(b"\x1bPq") {
        return Err("output does not start with SIXEL DCS".to_string());
    }
    if !output.windows(10).any(|window| window == b"\"1;1;64;64") {
        return Err("output does not contain expected SIXEL raster attributes".to_string());
    }
    if !output.ends_with(b"\x1b\\\n") {
        return Err("output does not end with SIXEL ST terminator".to_string());
    }
    if output.windows(3).any(|window| window == [ESC, b'_', b'G']) {
        return Err("output unexpectedly contains Kitty APC data".to_string());
    }
    if String::from_utf8_lossy(output).contains("\x1b]1337;File=") {
        return Err("output unexpectedly contains iTerm2 OSC 1337 File= data".to_string());
    }

    Ok(())
}

fn run() -> Result<(), String> {
    let args = parse_args()?;
    let output = make_sixel_output();
    assert_sixel_output(&output)?;

    if let Some(path) = args.capture {
        fs::write(path, &output).map_err(|error| format!("failed to write capture: {error}"))?;
    }

    io::stdout()
        .write_all(&output)
        .map_err(|error| format!("failed to write stdout: {error}"))?;
    eprintln!("rust_sixel_fixture=direct");
    eprintln!("rust_sixel_protocol=sixel");
    eprintln!("rust_sixel_size={WIDTH}x{HEIGHT}");
    eprintln!("rust_sixel_output_bytes={}", output.len());

    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}
