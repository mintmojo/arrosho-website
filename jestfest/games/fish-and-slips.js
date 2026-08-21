// Fish and Slips — client renderer (display + controller).
//
// Pure render functions of `data`, per PROTOCOL.md §7: no game state held
// here, no outcome ever decided here, no timer other than api.countdown's
// render loop (which only ever counts down to a SERVER-issued `endsAt` --
// PROTOCOL.md §6.1: only the server decides time is up). Every number here
// comes straight off the frame the relay sent; nothing is computed or
// guessed client-side. Player names and bid numbers are attacker/user
// controlled text -- everything goes through api.el/textContent, never
// innerHTML (see jestfest/js/el.js).
//
// View keys below (`bidding`, `revealed`, `duel-race`, `duel-vote`,
// `poach`) match the `view` strings src/games/fish-and-slips.js's
// displayView()/controllerView() send, 1:1.
//
// Styling follows the same convention jestfest/games/kwiplash.js
// established: import `el` directly from js/el.js (equivalent to api.el,
// but lets small layout helpers below be plain functions without needing
// `api` threaded through every one of them), and only reach for classes
// that actually exist in css/base.css + css/display.css + css/controller.css
// (jf-card, jf-eyebrow, jf-scoreboard*, jf-tap-option, jf-btn*, jf-field,
// jf-muted) -- there is no per-game stylesheet wired into display.html /
// controller.html in this build, so anything game-specific is inline style.

import { el } from '../js/el.js';

// ---------------------------------------------------------------------
// tiny layout helpers
// ---------------------------------------------------------------------

function panel(...kids) {
  return el('div', { class: 'jf-card', style: { width: '100%', maxWidth: '820px', margin: '0 auto' } }, ...kids);
}

function eyebrow(text) {
  return el('div', { class: 'jf-eyebrow', style: { color: 'var(--arr-teal)', marginBottom: '10px' } }, text);
}

function heading(text) {
  return el('h2', {
    style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: 'clamp(22px,3.4vw,32px)', lineHeight: '1.15', margin: '0 0 12px' },
  }, text);
}

function subtitle(text) {
  return el('p', { style: { color: 'var(--text-on-dark-muted)', fontSize: '15px', margin: '0 0 22px' } }, text);
}

function row(...kids) {
  return el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } }, ...kids);
}

function pill(text, tone) {
  const bg = tone === 'accent' ? 'rgba(63,158,175,0.22)' : 'rgba(230,232,228,0.12)';
  const fg = tone === 'accent' ? 'var(--arr-teal)' : 'var(--text-on-dark-muted)';
  return el('span', {
    style: {
      display: 'inline-block', padding: '4px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: '700', letterSpacing: '0.03em',
      background: bg, color: fg, textTransform: 'uppercase',
    },
  }, text);
}

// Stat pairs need much more air than a generic row: at a glance across a
// room, "BANK 10" and "BIDS IN 0/3" must read as two separate facts, not one
// run-on string. A 10px gap collides them.
function statRow(...kids) {
  return el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '44px', flexWrap: 'wrap', margin: '4px 0 2px' } }, ...kids);
}

function statBlock(label, value) {
  return el('div', {},
    el('div', { style: { fontSize: '12px', color: 'var(--text-on-dark-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' } }, label),
    el('div', { style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: '30px' } }, String(value))
  );
}

function countdownBlock(api, endsAt, label) {
  const num = el('span', { style: { fontFamily: 'var(--font-display)', fontSize: '44px' } }, '');
  api.countdown(num, endsAt);
  return el('div', { style: { textAlign: 'center' } },
    label ? el('div', { style: { fontSize: '12px', color: 'var(--text-on-dark-muted)', textTransform: 'uppercase', marginBottom: '4px' } }, label) : null,
    num,
    el('span', { style: { fontSize: '18px', color: 'var(--text-on-dark-muted)' } }, 's')
  );
}

function roundLabel(data) {
  const base = `Round ${Math.min(data.roundsPlayed + 1, data.roundLimit)} of ${data.roundLimit}`;
  return data.overtimeExtensions > 0 ? `${base} · Overtime` : base;
}

function standingsList(standings) {
  return el('div', { class: 'jf-scoreboard' },
    standings.map((p, i) => el('div', { class: 'jf-scoreboard-row', dataset: { rank: String(i + 1) } },
      el('span', { class: 'jf-scoreboard-rank' }, String(i + 1)),
      el('span', { class: 'jf-scoreboard-name' }, p.name + (p.hope ? ' :)' : ''), p.connected ? null : dimDot()),
      el('span', { class: 'jf-scoreboard-score' }, String(p.stash))
    ))
  );
}

function dimDot() {
  return el('span', { style: { marginLeft: '6px', fontSize: '11px', color: 'var(--text-on-dark-muted)' } }, '(offline)');
}

function logList(log) {
  if (!log || !log.length) return null;
  return el('div', { style: { marginTop: '18px' } },
    el('div', { style: { fontSize: '12px', color: 'var(--text-on-dark-muted)', textTransform: 'uppercase', marginBottom: '8px' } }, 'Recently'),
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      log.slice(0, 4).map((line) => el('div', { class: 'jf-muted', style: { fontSize: '13px' } }, line))
    )
  );
}

function bidsList(bids) {
  if (!bids) return null;
  const sorted = [...bids].sort((a, b) => b.value - a.value);
  return el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', margin: '18px 0' } },
    sorted.map((b) => el('div', {
      class: 'jf-card-inset',
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    },
      row(el('span', { style: { fontWeight: '600' } }, b.name), b.slip ? pill('Slip', 'accent') : null),
      el('span', { style: { fontFamily: 'var(--font-display)', fontSize: '20px' } }, String(b.value))
    ))
  );
}

function resolutionHeadline(resolution) {
  if (!resolution) return 'Round resolved';
  switch (resolution.kind) {
    case 'schooling':
      return `Schooling Together at ${resolution.value}!`;
    case 'noWinner':
      return 'No survivors this round';
    case 'duelUnclaimed':
      return 'DUEL! went unclaimed';
    case 'win':
      return `${resolution.winnerName} wins the round`;
    default:
      return 'Round resolved';
  }
}

function resolutionDetail(resolution) {
  if (!resolution) return '';
  switch (resolution.kind) {
    case 'schooling':
      return 'Every player independently wrote the same number — everyone earns 1 BR and the game ends now.';
    case 'noWinner':
      return 'Nobody survived the round (every bid collided or busted out) — no Tariff, no Bank change.';
    case 'duelUnclaimed':
      return `${(resolution.candidateNames || []).join(' and ')} both reset to 10 fish — nobody claimed the DUEL! in time.`;
    case 'win': {
      const parts = [`Tariff ${resolution.tariff} · Bank ${resolution.bank}`];
      if (resolution.soleSlip) parts.push('Won by Slip');
      if (resolution.collided && resolution.collided.length) parts.push(`${resolution.collided.length} Slip collision(s) reset to 10`);
      if (resolution.bustChain && resolution.bustChain.length) parts.push(`Cascaded past ${resolution.bustChain.length} Bust(es)`);
      return parts.join(' · ');
    }
    default:
      return '';
  }
}

function personalOutcome(playerId, resolution) {
  if (!resolution) return '';
  switch (resolution.kind) {
    case 'schooling':
      return 'You earned 1 BR — Schooling Together!';
    case 'noWinner':
      return 'No one won this round.';
    case 'duelUnclaimed':
      return (resolution.candidateIds || []).includes(playerId)
        ? 'Nobody claimed the DUEL! in time — your Stash reset to 10.'
        : 'The DUEL! went unclaimed — the round was voided.';
    case 'win':
      if (resolution.winnerId === playerId) return 'You won the round!';
      if (resolution.bustChain && resolution.bustChain.includes(playerId)) return "You Busted — your Stash reset to 10.";
      if (resolution.collided && resolution.collided.includes(playerId)) return 'Your Slip collided — your Stash reset to 10.';
      return "You're safe this round.";
    default:
      return '';
  }
}

// ---------------------------------------------------------------------
// bidding form (controller only) — keeps an in-progress, not-yet-submitted
// draft in a module-level variable, NOT as component state (this is a pure
// render function per PROTOCOL.md §7). The shell re-renders this view on
// every server push (e.g. whenever another player submits their own bid),
// so without this the player's half-typed number would vanish mid-round;
// the draft is reset once this player's bid is actually submitted. This is
// a UI convenience only — it never feeds back into game logic, and it is
// explicitly acceptable per PROTOCOL.md §7 ("a renderer must never hold
// game state") because the draft isn't game state, it's unsent input.
// ---------------------------------------------------------------------

let draftValue = '';
let draftSlip = false;

function biddingController(data, api) {
  if (data.hasSubmitted) {
    draftValue = '';
    draftSlip = false;
    return panel(
      eyebrow('Fish and Slips'),
      heading('Bid locked in'),
      subtitle(`You wrote ${data.myBid ? data.myBid.value : '?'}${data.myBid && data.myBid.slip ? ' with a Slip' : ''}.`),
      row(pill(`Waiting on ${data.waitingOn} more`)),
      footerStats(data)
    );
  }

  const numInput = el('input', {
    class: 'jf-field', type: 'number', inputmode: 'numeric', min: '0', step: '1',
    placeholder: 'How many fish?', value: draftValue,
    onInput: (e) => { draftValue = e.target.value; },
  });

  const slipToggle = el('label', {
    class: 'jf-tap-option', style: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  },
    el('input', {
      type: 'checkbox', checked: draftSlip,
      onChange: (e) => { draftSlip = e.target.checked; },
      style: { width: '18px', height: '18px' },
    }),
    el('span', {}, 'Play a Slip with this bid')
  );

  const submit = () => {
    // Only block a genuinely empty field client-side (nothing to send).
    // Everything else -- negative, non-integer, absurdly large -- is sent
    // as-is and left to the server's validation (PROTOCOL.md §5/§6: "server
    // validates EVERYTHING"), which replies with a toast rather than
    // silently no-op'ing here with no feedback at all.
    if (draftValue === '') return;
    api.send('bid', { value: Math.trunc(Number(draftValue)), slip: draftSlip });
  };

  return panel(
    eyebrow('Fish and Slips'),
    heading('Write your bid'),
    subtitle(`Bank is ${data.bank}. Your Stash: ${data.myStash}.`),
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
      numInput,
      slipToggle,
      el('button', { class: 'jf-btn jf-btn-primary jf-btn-block', onClick: submit }, 'Lock in bid')
    ),
    footerStats(data)
  );
}

function footerStats(data) {
  return el('p', { class: 'jf-muted', style: { fontSize: '12.5px', marginTop: '18px' } },
    `Round ${Math.min(data.roundsPlayed + 1, data.roundLimit)} of ${data.roundLimit}`);
}

// ---------------------------------------------------------------------
// DISPLAY
// ---------------------------------------------------------------------

const display = {
  bidding(data) {
    return panel(
      eyebrow(roundLabel(data)),
      heading('Fish and Slips'),
      statRow(statBlock('Bank', data.bank), statBlock('Bids in', `${data.submittedCount} / ${data.participantCount}`)),
      el('div', { style: { marginTop: '26px' } }, standingsList(data.standings)),
      logList(data.log)
    );
  },

  revealed(data, api) {
    return panel(
      eyebrow(roundLabel(data)),
      heading(resolutionHeadline(data.resolution)),
      subtitle(resolutionDetail(data.resolution)),
      bidsList(data.bids),
      el('div', { style: { marginTop: '20px' } }, standingsList(data.standings)),
      data.gameEnding
        ? el('div', { style: { marginTop: '22px' } }, pill('Final result — press Next to close out the game', 'accent'))
        : null,
      el('div', { style: { marginTop: '22px' } },
        el('button', { class: 'jf-btn jf-btn-primary', onClick: () => api.advance() }, data.gameEnding ? 'See final standings' : 'Next round')
      )
    );
  },

  'duel-race'(data, api) {
    const [a, b] = data.duel.candidates;
    return panel(
      eyebrow('DUEL!'),
      heading(`${a ? a.name : '?'} vs ${b ? b.name : '?'}`),
      subtitle(`Tied at ${data.duel.value}. First to claim it on their phone wins.`),
      el('div', { style: { display: 'flex', justifyContent: 'center', margin: '20px 0' } }, countdownBlock(api, data.duel.endsAt, 'Time left')),
      el('p', { class: 'jf-muted', style: { fontSize: '13px', textAlign: 'center' } },
        'A newcomer can steal this DUEL! by joining the room with the code before time runs out.')
    );
  },

  'duel-vote'(data) {
    const isNewcomer = data.duel.reason === 'newcomer';
    return panel(
      eyebrow('DUEL!' + (data.duel.voteRound > 0 ? ` — recursed vote ${data.duel.voteRound + 1}` : '')),
      heading(isNewcomer ? 'New players are DUEL-ing for the Bank' : `Tied at ${data.duel.value}`),
      subtitle(
        (isNewcomer
          ? data.duel.candidates.map((c) => c.name).join(' vs ')
          : `${data.duel.candidates.map((c) => c.name).join(' vs ')} sit out — everyone else votes.`)
      ),
      row(pill(`Votes: ${data.duel.votesIn} / ${data.duel.votesNeeded}`)),
      el('div', { style: { marginTop: '22px' } }, standingsList(data.standings))
    );
  },

  poach(data, api) {
    const names = data.candidates.map((c) => c.name).join(' and ');
    const multiway = data.candidates.length > 1;
    return panel(
      eyebrow('Fresh Catch!'),
      heading(multiway ? `${names} are DUEL-ing to poach the Bank` : `${names} is poaching the Bank`),
      subtitle(`The Bank (${data.bank}) is on the line. The round in progress is voided.`),
      el('div', { style: { display: 'flex', justifyContent: 'center', margin: '20px 0' } }, countdownBlock(api, data.endsAt, 'Time left'))
    );
  },
};

// ---------------------------------------------------------------------
// CONTROLLER
// ---------------------------------------------------------------------

const controller = {
  bidding: biddingController,

  revealed(data, api) {
    return panel(
      eyebrow(roundLabel(data)),
      heading(personalOutcome(api.me && api.me.id, data.resolution)),
      subtitle('Full results are on the big screen.'),
      statRow(statBlock('Bank', data.bank), statBlock('Your Stash', data.myStash))
    );
  },

  'duel-race'(data, api) {
    if (data.isCandidate) {
      return panel(
        eyebrow('DUEL!'),
        heading('Claim it!'),
        subtitle(`Tied at ${data.duel.value}. First tap wins.`),
        el('div', { style: { display: 'flex', justifyContent: 'center', margin: '18px 0' } }, countdownBlock(api, data.duel.endsAt, 'Time left')),
        el('button', {
          class: 'jf-btn jf-btn-primary jf-btn-block',
          style: { fontSize: '22px', padding: '26px' },
          disabled: !!data.alreadyClaimed,
          onClick: () => api.send('duelRace', {}),
        }, 'CLAIM IT')
      );
    }
    return panel(
      eyebrow('DUEL!'),
      heading('Watch the big screen'),
      subtitle('Two players are racing to claim this DUEL!.'),
      el('div', { style: { display: 'flex', justifyContent: 'center', margin: '18px 0' } }, countdownBlock(api, data.duel.endsAt, 'Time left'))
    );
  },

  'duel-vote'(data, api) {
    if (data.isCandidate) {
      return panel(
        eyebrow('DUEL!'),
        heading("You're sitting this one out"),
        subtitle(data.duel.reason === 'newcomer' ? "Everyone else is voting on who poaches the Bank." : `Tied at ${data.duel.value}. Everyone else is voting.`)
      );
    }
    if (!data.isVoter) {
      return panel(eyebrow('DUEL!'), heading('Watch the big screen'), subtitle('A DUEL! is underway.'));
    }
    return panel(
      eyebrow('DUEL! — your vote'),
      heading('Who wins this DUEL!?'),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        data.duel.candidates.map((c) => el('button', {
          class: 'jf-tap-option',
          style: data.myVote === c.id ? { borderColor: 'var(--arr-teal)', background: 'rgba(63,158,175,0.16)' } : null,
          onClick: () => api.send('duelVote', { candidateId: c.id }),
        }, c.name))
      ),
      data.myVote
        ? el('p', { class: 'jf-muted', style: { fontSize: '13px', marginTop: '10px' } }, 'Vote locked in — you can change it until everyone has voted.')
        : null
    );
  },

  poach(data, api) {
    if (data.isCandidate) {
      return panel(
        eyebrow('Fresh Catch!'),
        heading(data.multiway ? "You're DUEL-ing for the Bank!" : "You're poaching the Bank!"),
        subtitle(data.multiway ? 'Another newcomer joined at the same moment — the two (or more) of you will DUEL for it.' : `The Bank (${data.bank}) is about to become your Stash.`),
        el('div', { style: { display: 'flex', justifyContent: 'center', margin: '18px 0' } }, countdownBlock(api, data.endsAt, 'Time left'))
      );
    }
    return panel(
      eyebrow('Fresh Catch!'),
      heading('A new player is joining'),
      subtitle('This round is being voided for everyone already playing.')
    );
  },
};

export default {
  id: 'fish-and-slips',
  title: 'Fish and Slips',
  blurb: 'Secret bids on a shared pot — one Slip can steal it outright.',
  display,
  controller,
};
