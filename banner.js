const os = require('os');

module.exports = function showBanner() {
    const disabled = process.env.NO_COLOR === '1';
    const tty = process.stdout.isTTY && !disabled;

    const G = '\x1b[38;5;221m'; // Champagne gold
    const W = '\x1b[38;5;255m'; // Ivory
    const D = '\x1b[38;5;245m'; // Silver
    const GREEN = '\x1b[38;5;114m';
    const RESET = '\x1b[0m';
    const BOLD = '\x1b[1m';

    const color = (c, s) => tty ? c + s + RESET : s;
    const sleep = ms => Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms
    );

    const write = s => process.stdout.write(s);
    const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    function progress(label, duration = 100) { // Giảm thời gian xuống 100ms
        const total = 18;

        for (let i = 0; i <= total; i++) {
            const percent = Math.round(i / total * 100);
            const bar = '■'.repeat(i) + '─'.repeat(total - i);

            write(
                '\r  ' +
                color(W, label.padEnd(19)) +
                ' ' +
                color(G, bar) +
                ' ' +
                color(W, String(percent).padStart(3) + '%') +
                '\x1b[K'
            );

            if (i < total) sleep(duration / total);
        }

        write('\n');
    }

    function startup() {
        if (!tty) {
            console.log('WHG LUXURY EDITION - STARTING');
            return;
        }

        console.clear();

        // Bỏ qua các hiệu ứng chờ dài dòng, chạy thẳng vào logo
        write('\n\n');
        write(color(G, '                    W H G'));
        write('\n');
        write(color(W, '              L U X U R Y   E D I T I O N'));
        write('\n\n');
        write(color(G, '  ' + line));
        write('\n\n');

        // Chạy thanh Loading siêu tốc (tổng cộng ~0.1s)
        progress('INITIALIZING', 100);
        progress('LOADING MODULES', 100);
        progress('PREPARING RUNTIME', 100);
        progress('SYSTEM CHECK', 100);

        write('\n');
        write('  ' + color(GREEN, '✓') + color(W, ' INITIALIZATION COMPLETE'));
        write('\n');
        write('  ' + color(GREEN, '✓') + color(W, ' ALL STARTUP STEPS FINISHED'));
        write('\n\n');
    }

    startup();

    const ram = (process.memoryUsage().rss / 1048576).toFixed(1);
    const uptime = Math.floor(process.uptime());

    console.log(color(G, '  ' + line));
    console.log('');
    console.log(color(G, '       W H G'));
    console.log(color(D, '       PRIVATE AUTOMATION SYSTEM'));
    console.log('');
    console.log(color(G, '  ' + line));

    console.log('');
    console.log(color(W + BOLD, '  SYSTEM INFORMATION'));
    console.log('');

    const info = [
        ['PREFIX', '!'],
        ['ADMINISTRATORS', '02'],
        ['PROCESS ID', process.pid],
        ['MEMORY USAGE', ram + ' MB'],
        ['UPTIME', uptime + ' SEC'],
        ['PLATFORM', os.platform() + ' / ' + os.arch()]
    ];

    info.forEach(([key, value]) => {
        console.log(
            '  ' + color(G, '◆') +
            ' ' + color(D, key.padEnd(18)) +
            color(W, value)
        );
    });

    console.log('');
    console.log(color(G, '  ' + line));
    console.log('');
    console.log(
        '  ' + color(D, 'SYSTEM STATUS') +
        '       ' + color(GREEN, '● OPERATIONAL')
    );
    console.log(
        '  ' + color(D, 'EDITION') +
        '           ' + color(G, 'LUXURY')
    );

    console.log('');
    console.log(color(G, '  ' + line));
    console.log(color(D, '          DESIGNED FOR EXCELLENCE'));
    console.log(color(G, '               W H G  © 2026'));
    console.log('\n');
};
