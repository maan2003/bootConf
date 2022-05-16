## bootConf

Create and update EFI boot entries.

### Config

The config file is stored in `/etc/boot.toml`.

#### Sample Config

```toml
[system]
boot_disk = "/dev/nvme0n1"
boot_part = 1

[[kernel]]
name = "Linux(bootConf)"
kernel = "/vmlinuz-linux"
cmdline = """\
initrd=/initramfs-linux.img resume=/dev/nvme0n1p2 rw \
"""
```

### Run

To run this program, you need to have deno installed
```sh
sudo deno run --allow-read=/etc/boot.toml --allow-run=efibootmgr,findmnt https://github.com/Maan2003/bootConf/raw/master/bootConf.ts
```

### Installation

```sh
deno install -f --allow-read=/etc/boot.toml --allow-run=efibootmgr,findmnt https://github.com/Maan2003/bootConf/raw/master/bootConf.ts
```
