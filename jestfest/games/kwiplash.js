// Kwiplash — client renderer (display + controller).
//
// Pure render functions of `data`, per PROTOCOL.md §7: no game state held
// here, no timers started here beyond api.countdown's render loop, no
// outcome ever decided here — every number on screen (scores, vote
// counts, who won) comes straight from the server frame. Player names and
// answers are attacker-controlled text; every place one is shown uses
// api.el/textContent, never innerHTML (see api.el, jestfest/js/el.js).
//
// View keys below (`writing`, `voting`, `reveal`, `standings`,
// `final-voting`, `final-reveal`) match the `view` strings sent by
// src/games/kwiplash.js's displayView()/controllerView() 1:1.
//
// `el` is imported directly rather than read off `api.el` per call: shell.js's
// makeApi() hands out the exact same `el` from js/el.js every time (see
// jestfest/js/shell.js), so this is equivalent to api.el but lets the small
// layout helpers below (panel/eyebrow/etc.) be plain top-level functions
// instead of needing `api` threaded through every one of them.

import { el } from '../js/el.js';

function fmtPts(n) {
  return (n > 0 ? '+' : '') + n;
}

function countdownEl(api, endsAt, label) {
  const secs = api.el('span', { class: 'kw-countdown-num' }, '');
  api.countdown(secs, endsAt);
  return api.el('div', { class: 'kw-countdown' },
    label ? api.el('span', { class: 'kw-countdown-label' }, label) : null,
    secs,
    api.el('span', { class: 'kw-countdown-unit' }, 's')
  );
}

function eyebrow(text) {
  return el('div', { class: 'jf-eyebrow', style: { color: 'var(--arr-teal)', marginBottom: '10px' } }, text);
}
function panel(...kids) {
  return el('div', {
    class: 'jf-card',
    style: { width: '100%', maxWidth: '760px', margin: '0 auto' },
  }, ...kids);
}

function promptBlock(text) {
  return el('h2', {
    style: {
      fontFamily: 'var(--font-display)', fontWeight: '400',
      fontSize: 'clamp(22px,3.4vw,32px)', lineHeight: '1.15', margin: '0 0 22px',
    },
  }, text);
}

function progressLine(text) {
  return el('p', { style: { color: 'var(--text-on-dark-muted)', fontSize: '14px', marginTop: '10px' } }, text);
}

// ---------------------------------------------------------------------
// DISPLAY
// ---------------------------------------------------------------------

function displayWriting(data, api) {
  return panel(
    eyebrow(data.round),
    api.el('h2', { style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: 'clamp(24px,4vw,36px)', textTransform: 'uppercase', margin: '0 0 16px' } },
      'Everyone is writing…'),
    countdownEl(api, data.endsAt, 'Time left'),
    progressLine(`${data.submittedPlayers} of ${data.totalPlayers} players have locked in their answers.`)
  );
}

function displayVoting(data, api) {
  if (!data.answers) return panel(api.el('p', {}, 'Waiting for the next matchup…'));
  return panel(
    eyebrow(`${data.round} · Matchup ${data.matchupNumber} of ${data.matchupCount}`),
    promptBlock(data.promptText),
    countdownEl(api, data.endsAt, 'Voting closes in'),
    api.el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' } },
      answerTile('A', data.answers.A),
      answerTile('B', data.answers.B)
    ),
    progressLine('Everyone except the two who wrote these is voting now.')
  );
}

function answerTile(key, text) {
  return el('div', {
    class: 'jf-card-inset',
    style: { padding: '22px', fontSize: '17px', lineHeight: '1.5', minHeight: '96px' },
  },
    el('div', { class: 'jf-eyebrow', style: { marginBottom: '10px' } }, `Answer ${key}`),
    el('p', { style: { margin: 0 } }, text)
  );
}

function revealBody(data, api, forDisplay) {
  if (!data.entries || !data.entries.length) return panel(api.el('p', {}, 'Tallying votes…'));
  return panel(
    eyebrow(`${data.round} · Matchup ${data.matchupNumber} of ${data.matchupCount}`),
    promptBlock(data.promptText),
    api.el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } },
      data.entries.map((e) => resultTile(e))
    ),
    forDisplay ? api.el('div', { style: { marginTop: '28px', textAlign: 'center' } },
      api.el('button', { class: 'jf-btn jf-btn-primary', onClick: () => api.advance() }, 'Continue')
    ) : null
  );
}

function resultTile(entry) {
  return el('div', {
    class: 'jf-card-inset',
    style: {
      padding: '22px', fontSize: '16px', lineHeight: '1.5',
      border: entry.landslide ? '1px solid var(--arr-teal)' : undefined,
      background: entry.landslide ? 'rgba(63,158,175,0.14)' : undefined,
    },
  },
    el('div', { class: 'jf-eyebrow', style: { marginBottom: '8px' } }, entry.authorName),
    el('p', { style: { margin: '0 0 14px' } }, entry.text),
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--text-on-dark-muted)' } },
      el('span', {}, `${entry.votes} vote${entry.votes === 1 ? '' : 's'}`),
      el('span', { style: { fontWeight: 700, color: entry.points > 0 ? 'var(--arr-teal)' : 'var(--text-on-dark-muted)' } }, fmtPts(entry.points))
    ),
    entry.landslide ? el('div', { style: { marginTop: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--arr-teal)' } }, 'LANDSLIDE BONUS') : null
  );
}

function displayReveal(data, api) {
  return revealBody(data, api, true);
}

function displayStandings(data, api) {
  return panel(
    eyebrow(`${data.round} complete`),
    api.el('h2', { style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: 'clamp(24px,4vw,36px)', textTransform: 'uppercase', margin: '0 0 20px' } },
      'Standings'),
    scoreRows(data.rows, api),
    api.el('div', { style: { marginTop: '28px', textAlign: 'center' } },
      api.el('button', { class: 'jf-btn jf-btn-primary', onClick: () => api.advance() }, 'Continue')
    )
  );
}

function scoreRows(rows, api) {
  return api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
    rows.map((r, i) => api.el('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '16px',
        background: i === 0 ? 'rgba(63,158,175,0.16)' : 'var(--surface-inset)',
        borderRadius: 'var(--radius-field)', padding: '12px 16px',
      },
    },
      api.el('span', { style: { fontFamily: 'var(--font-display)', width: '24px', color: 'var(--text-on-dark-muted)' } }, String(i + 1)),
      api.el('span', { style: { flex: '1', fontWeight: 600 } }, r.name),
      api.el('span', { style: { fontWeight: 700, color: 'var(--text-accent)' } }, String(r.score))
    ))
  );
}

function displayFinalVoting(data, api) {
  return panel(
    eyebrow(data.round),
    promptBlock(data.promptText),
    countdownEl(api, data.endsAt, 'Voting closes in'),
    api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' } },
      (data.entries || []).map((e) => api.el('div', { class: 'jf-card-inset', style: { padding: '18px' } },
        api.el('div', { class: 'jf-eyebrow', style: { marginBottom: '8px' } }, e.name),
        api.el('p', { style: { margin: 0, fontSize: '16px' } }, e.text)
      ))
    ),
    progressLine('Everyone votes gold, silver, and bronze — nobody can pick their own answer.')
  );
}

const MEDAL_LABEL = { gold: 'GOLD', silver: 'SILVER', bronze: 'BRONZE' };
const MEDAL_COLOR = { gold: '#D2A24C', silver: '#B9C2C8', bronze: '#B5713C' };

function podiumTile(row) {
  return el('div', { class: 'jf-card-inset', style: { padding: '20px' } },
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
      el('span', { class: 'jf-eyebrow' }, row.name),
      el('span', { style: { fontWeight: 700, color: 'var(--text-accent)' } }, fmtPts(row.points))
    ),
    el('p', { style: { margin: '10px 0 12px', fontSize: '16px' } }, row.text),
    el('div', { style: { display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--text-on-dark-muted)' } },
      medalCount('gold', row.gold),
      medalCount('silver', row.silver),
      medalCount('bronze', row.bronze)
    )
  );
}

function medalCount(medal, n) {
  return el('span', { style: { color: MEDAL_COLOR[medal], fontWeight: 700 } }, `${MEDAL_LABEL[medal]} ×${n}`);
}

function displayFinalReveal(data, api) {
  return panel(
    eyebrow(data.round),
    promptBlock(data.promptText),
    api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
      (data.rows || []).map((r) => podiumTile(r))
    ),
    api.el('div', { style: { marginTop: '30px', textAlign: 'center' } },
      api.el('div', { class: 'jf-eyebrow', style: { marginBottom: '8px' } }, 'Bragging Rights'),
      api.el('h3', {
        style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: 'clamp(22px,3.6vw,32px)', textTransform: 'uppercase' },
      }, (data.winners || []).join(' & ') + (data.winners && data.winners.length ? ' wins the night\'s BR point!' : ''))
    ),
    api.el('div', { style: { marginTop: '24px', textAlign: 'center' } },
      api.el('button', { class: 'jf-btn jf-btn-primary', onClick: () => api.advance() }, 'Back to lobby')
    )
  );
}

// ---------------------------------------------------------------------
// CONTROLLER
// ---------------------------------------------------------------------

function controllerWriting(data, api) {
  const prompts = data.prompts || [];
  if (!prompts.length) {
    return panel(
      eyebrow(data.round),
      api.el('p', {}, "You're sitting this round out — hang tight, you're back in next round."),
      countdownEl(api, data.endsAt, 'Time left')
    );
  }
  return panel(
    eyebrow(data.round),
    countdownEl(api, data.endsAt, 'Time left'),
    api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '18px' } },
      prompts.map((p) => writingCard(p, api))
    )
  );
}

function writingCard(p, api) {
  if (p.submitted) {
    return api.el('div', { class: 'jf-card-inset', style: { padding: '18px' } },
      api.el('p', { style: { margin: '0 0 10px', fontSize: '16px', fontWeight: 600 } }, p.text),
      api.el('div', { class: 'jf-eyebrow', style: { color: 'var(--arr-teal)' } }, 'Locked in'),
      api.el('p', { style: { margin: '6px 0 0', fontSize: '14px', opacity: 0.8 } }, p.myAnswer)
    );
  }
  let value = p.myAnswer || '';
  const textarea = api.el('textarea', {
    class: 'jf-field', rows: '2', maxlength: '140', placeholder: 'Your funniest answer…',
    value,
    onInput: (e) => { value = e.target.value; },
  });
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    api.send('submit', { promptId: p.promptId, text: trimmed });
  };
  return api.el('div', { class: 'jf-card-inset', style: { padding: '18px' } },
    api.el('p', { style: { margin: '0 0 12px', fontSize: '16px', fontWeight: 600 } }, p.text),
    textarea,
    api.el('button', {
      class: 'jf-btn jf-btn-primary jf-btn-block', style: { marginTop: '12px' },
      onClick: submit,
    }, 'Lock it in')
  );
}

function controllerVoting(data, api) {
  if (!data.answers) return panel(api.el('p', {}, 'Waiting for the next matchup…'));
  if (!data.canVote) {
    return panel(
      eyebrow(`${data.round} · Matchup ${data.matchupNumber} of ${data.matchupCount}`),
      promptBlock(data.promptText),
      api.el('p', { style: { color: 'var(--text-on-dark-muted)' } }, "One of these is yours — you'll sit this vote out."),
      api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' } },
        answerTileController('A', data.answers.A, false, null),
        answerTileController('B', data.answers.B, false, null)
      )
    );
  }
  return panel(
    eyebrow(`${data.round} · Matchup ${data.matchupNumber} of ${data.matchupCount}`),
    promptBlock(data.promptText),
    countdownEl(api, data.endsAt, 'Voting closes in'),
    api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' } },
      answerTileController('A', data.answers.A, true, data.myVote, api, data.matchupId),
      answerTileController('B', data.answers.B, true, data.myVote, api, data.matchupId)
    )
  );
}

function answerTileController(key, text, canVote, myVote, api, matchupId) {
  const chosen = myVote === key;
  const kids = [
    el('p', { style: { margin: canVote ? '0 0 12px' : 0, fontSize: '16px' } }, text),
  ];
  if (canVote) {
    kids.push(el('button', {
      class: `jf-btn ${chosen ? 'jf-btn-primary' : 'jf-btn-ghost'} jf-btn-block`,
      onClick: () => api.send('vote', { matchupId, choice: key }),
    }, chosen ? 'Voted' : `Vote ${key}`));
  }
  return el('div', { class: 'jf-card-inset', style: { padding: '18px' } }, ...kids);
}

function controllerReveal(data, api) {
  return revealBody(data, api, false);
}

function controllerStandings(data, api) {
  return panel(
    eyebrow(`${data.round} complete`),
    scoreRows(data.rows, api)
  );
}

function controllerFinalVoting(data, api) {
  const mine = data.myBallot || { gold: null, silver: null, bronze: null };
  const setSlot = (slot, playerId) => {
    const next = { gold: mine.gold, silver: mine.silver, bronze: mine.bronze };
    for (const k of ['gold', 'silver', 'bronze']) if (next[k] === playerId) next[k] = null;
    next[slot] = next[slot] === playerId ? null : playerId;
    api.send('ballot', next);
  };
  return panel(
    eyebrow(data.round),
    promptBlock(data.promptText),
    countdownEl(api, data.endsAt, 'Voting closes in'),
    api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' } },
      (data.entries || []).map((e) => finalBallotCard(e, mine, setSlot, api))
    )
  );
}

function finalBallotCard(entry, mine, setSlot, api) {
  const currentMedal = ['gold', 'silver', 'bronze'].find((k) => mine[k] === entry.playerId) || null;
  return api.el('div', { class: 'jf-card-inset', style: { padding: '18px' } },
    api.el('div', { class: 'jf-eyebrow', style: { marginBottom: '8px' } }, entry.name),
    api.el('p', { style: { margin: '0 0 14px', fontSize: '16px' } }, entry.text),
    api.el('div', { style: { display: 'flex', gap: '10px' } },
      ['gold', 'silver', 'bronze'].map((medal) => api.el('button', {
        class: `jf-btn ${currentMedal === medal ? 'jf-btn-primary' : 'jf-btn-ghost'}`,
        style: { flex: '1', padding: '10px 8px', fontSize: '13px' },
        onClick: () => setSlot(medal, entry.playerId),
      }, MEDAL_LABEL[medal]))
    )
  );
}

function controllerFinalReveal(data, api) {
  return panel(
    eyebrow(data.round),
    api.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
      (data.rows || []).map((r) => podiumTile(r))
    ),
    api.el('div', { style: { marginTop: '24px', textAlign: 'center' } },
      api.el('div', { class: 'jf-eyebrow', style: { marginBottom: '8px' } }, 'Bragging Rights'),
      api.el('h3', {
        style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: '22px', textTransform: 'uppercase' },
      }, (data.winners || []).join(' & '))
    )
  );
}

export default {
  id: 'kwiplash',
  title: 'Kwiplash',
  blurb: 'One prompt, two answers, everyone else votes on the funnier one.',
  display: {
    writing: displayWriting,
    voting: displayVoting,
    reveal: displayReveal,
    standings: displayStandings,
    'final-voting': displayFinalVoting,
    'final-reveal': displayFinalReveal,
  },
  controller: {
    writing: controllerWriting,
    voting: controllerVoting,
    reveal: controllerReveal,
    standings: controllerStandings,
    'final-voting': controllerFinalVoting,
    'final-reveal': controllerFinalReveal,
  },
};
