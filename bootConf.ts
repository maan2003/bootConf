import * as toml from "https://deno.land/std@0.139.0/encoding/toml.ts";

interface Config {
    system: SystemConfig;
    kernel: KernelConfig[];
};

interface KernelConfig {
    name: string;
    kernel: string;
    cmdline: string;
}

interface SystemConfig {
    boot_disk: string;
    boot_part: number;
}

interface BootEntry {
    name: string;
    num: number;
}

interface ToString {
    toString(): string;
};

async function runCommand(cmd: ToString[]): Promise<string> {
    console.log("> " + cmd.join(" "));
    const proc = Deno.run({
        cmd: cmd.map((s) => s.toString()),
        stdout: "piped",
    });
    const output = await proc.output();
    const outputString = new TextDecoder().decode(output);
    return outputString;
}

async function getBootEntries(): Promise<BootEntry[]> {
    const output = await runCommand(["efibootmgr"]);
    const entries: BootEntry[] = [];
    const regex = /^Boot(\d+)\*? (.*)$/gm;
    let match;
    while ((match = regex.exec(output)) !== null) {
        entries.push({
            name: match[2],
            num: Number(match[1]),
        });
    }
    return entries;
}

function validateConfig(config: Record<string, unknown>): Config {
    // TODO: validate config
    return config as unknown as Config;
}

async function readConfig(): Promise<Config> {
    const buf = await Deno.readFile("/etc/boot.toml");
    const text = new TextDecoder().decode(buf);
    const data = toml.parse(text);
    return validateConfig(data);
}

function systemArgs(cfg: SystemConfig): ToString[] {
    return ["--disk", cfg.boot_disk, "--part", cfg.boot_part];
}

async function findCurrentRoot(): Promise<string> {
    return (await runCommand(["findmnt", "-r", "-n", "-o", "PARTUUID", "/"])).trim();
}

async function getCmdline(kernel: KernelConfig): Promise<string> {
    return `root=PARTUUID=${await findCurrentRoot()} ${kernel.cmdline}`;
}

async function updateEntry(entries: BootEntry[], system: SystemConfig, kernel: KernelConfig) {
    const entry = entries.find((e) => e.name === kernel.name);
    let boot_num_args: ToString[] = [];
    if (entry !== undefined) {
        console.log("Updating entry: " + entry.name);
        boot_num_args = ["--bootnum", entry.num];
        await runCommand(["efibootmgr", ...boot_num_args, "--delete-bootnum", ...systemArgs(system)]);
    } else {
        console.log("Creating entry: " + kernel.name);
    }

    await runCommand([
        "efibootmgr", ...boot_num_args, ...systemArgs(system),
        "--create", "--label", kernel.name, "--loader", kernel.kernel, "--unicode", await getCmdline(kernel)]);
}

async function main() {
    const config = await readConfig();
    const entries = await getBootEntries();
    for (const kernel of config.kernel) {
        await updateEntry(entries, config.system, kernel);
    }
}

main();
