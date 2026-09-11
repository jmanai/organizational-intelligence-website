/* =========================================================================
   THE HOW WE WORK CHECK — assessment engine
   Implements §11–§14 of the Organizational Intelligence build brief.

   Two instruments share this engine:
     • leader  (default)                 : the WOW Assessment
     • team    (?perspective=team)       — the anonymous team-member version

   Both use the same dimensions, question order, response options and point
   values, so leader/team comparison is valid at the instrument level (§12.4).

   This file is deliberately self-contained and framework-free so the logic
   can be lifted into a form product, Apps Script, or a CMS without rewrites.
   ========================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------ 1. SCALE */
  /* §11.2 — "I don't know" scores 1 on purpose: uncertainty about
     fundamental ways of working is itself informative. */
  var SCALE = [
    { label: 'Absolutely',   points: 4 },
    { label: 'Mostly',       points: 3 },
    { label: 'Sometimes',    points: 2 },
    { label: 'Rarely',       points: 1 },
    { label: 'Not at all',   points: 0 },
    { label: "I don't know", points: 1 }
  ];

  var MAX_PER_DIMENSION = 16; /* 4 questions × 4 points */
  var MAX_TOTAL = 80;

  /* -------------------------------------------------------- 2. QUESTIONS */
  var DIMENSIONS = [
    {
      key: 'MEET',
      name: 'Meet',
      question: 'Do your meetings earn their place?',
      questions: [
        { leader: 'Most of our meetings have a clear purpose and intended outcome before they begin.',
          team:   'The meetings I&rsquo;m invited to usually have a clear purpose and intended outcome before they begin.' },
        { leader: 'People generally know why they personally need to be in a meeting.',
          team:   'I generally know why I personally need to be in the meetings I&rsquo;m invited to.' },
        { leader: 'Our meetings usually end with clear decisions, actions, or next steps when those are required.',
          team:   'The meetings I attend usually end with clear decisions, actions, or next steps when those are required.' },
        { leader: 'We regularly question whether recurring meetings still need to exist.',
          team:   'Our team questions whether recurring meetings still need to exist rather than keeping them automatically.' }
      ],
      bands: [
        { min: 75, label: 'Meetings are earning their place', text: 'Protect the system by continuing to question recurring meetings and designing around outcomes.' },
        { min: 50, label: 'Meeting creep',  text: 'Some meetings work; others may survive because nobody has challenged them.' },
        { min: 0,  label: 'Meeting debt',   text: 'Your calendar may be carrying meetings that do not produce enough value for the time they consume.' }
      ],
      recommendation: {
        title: 'Better Meetings',
        text: 'A meeting audit and redesign: understand the meeting landscape, calculate its cost, retire what has stopped earning its place, and improve the meetings worth keeping.'
      }
    },
    {
      key: 'DECIDE',
      name: 'Decide',
      question: 'Can decisions actually move?',
      questions: [
        { leader: 'For important decisions, it&rsquo;s usually clear who has the authority to make the final call.',
          team:   'For important decisions, I usually know who has the authority to make the final call.' },
        { leader: 'We deliberately choose how a decision should be made rather than defaulting to consensus or seniority.',
          team:   'I understand how different types of decisions are expected to be made on our team.' },
        { leader: 'People understand which decisions they can make independently and which genuinely need consultation or escalation.',
          team:   'I know which decisions I can make independently and which genuinely need consultation or escalation.' },
        { leader: 'Once a decision has been made, we rarely reopen it simply because someone wasn&rsquo;t in the room or disagrees with the outcome.',
          team:   'Once a decision has been made, it generally stays made unless new information genuinely requires us to revisit it.' }
      ],
      bands: [
        { min: 75, label: 'Decisions move',     text: 'People generally understand how decisions happen and where authority sits.' },
        { min: 50, label: 'Decision friction',  text: 'Consensus, escalation, or unclear ownership may be slowing decisions.' },
        { min: 0,  label: 'Decision gridlock',  text: 'Too much decision-making may depend on hierarchy, consensus, or figuring out who is allowed to decide.' }
      ],
      recommendation: {
        title: 'A decision rights working session',
        text: 'Make decision-making explicit: who decides what, how each type of decision gets made, what needs consultation, and what stays decided.'
      }
    },
    {
      key: 'SHARE',
      name: 'Share',
      question: 'Does information move?',
      questions: [
        { leader: 'People can easily find the information they need to do their work without having to ask someone for it.',
          team:   'I can easily find the information I need to do my work without having to ask someone for it.' },
        { leader: 'Important information is shared beyond the people who happened to be in the meeting where it was discussed.',
          team:   'I can access important information even if I wasn&rsquo;t in the meeting where it was discussed.' },
        { leader: 'Work in progress (plans, drafts, projects, decisions) is visible to the people who need context, not only once it&rsquo;s finished.',
          team:   'I have useful visibility into relevant work in progress (plans, drafts, projects, decisions) rather than seeing things only once they&rsquo;re finished.' },
        { leader: 'We generally default to making information accessible unless there&rsquo;s a clear reason for it to be restricted.',
          team:   'Information I need is generally accessible unless there&rsquo;s a clear reason for it to be restricted.' }
      ],
      bands: [
        { min: 75, label: 'Information flows',        text: 'People can generally access the context they need without chasing it.' },
        { min: 50, label: 'Information pockets',      text: 'Too much information may depend on being in the right meeting, channel, or conversation.' },
        { min: 0,  label: 'Information bottlenecks',  text: 'Knowledge may be concentrated around individuals, meetings, or leadership, making autonomy difficult.' }
      ],
      recommendation: {
        title: 'An information flow working session',
        text: 'Design how information actually travels: what is visible by default, where work in progress lives, and what people should never have to ask for.'
      }
    },
    {
      key: 'AGREE',
      name: 'Agree',
      question: 'Have you actually agreed how you&rsquo;ll work together?',
      questions: [
        { leader: 'Our team has explicitly discussed and agreed how we want to work together.',
          team:   'I understand the agreements our team has made about how we work together.' },
        { leader: 'We have shared expectations about communication, including where different types of communication should happen.',
          team:   'I know where different types of communication are expected to happen.' },
        { leader: 'We have shared expectations around things like responsiveness, availability, focus time, and collaboration.',
          team:   'I understand our shared expectations around responsiveness, availability, focus time, and collaboration.' },
        { leader: 'When our context changes (new people, new leadership, growth, restructuring, new ways of working) we revisit our agreements.',
          team:   'When our team or context changes, we revisit how we work together.' }
      ],
      bands: [
        { min: 75, label: 'Explicit agreements', text: 'Your team has consciously discussed how it wants to work.' },
        { min: 50, label: 'Unwritten rules',     text: 'Some expectations are shared; others are learned through observation and interpretation.' },
        { min: 0,  label: 'Everyone has their own operating manual', text: 'People may be working from different assumptions about communication, autonomy, responsiveness, and collaboration.' }
      ],
      recommendation: {
        title: 'A Team Agreements workshop',
        text: 'Turn the unwritten rules into real agreements: communication, decisions, autonomy, responsiveness, and what happens when you disagree.'
      }
    },
    {
      key: 'ALIGN',
      name: 'Align',
      question: 'Do people know what they&rsquo;re moving toward?',
      questions: [
        { leader: 'People on our team can explain what we&rsquo;re trying to achieve and why it matters.',
          team:   'I can explain what our team is trying to achieve and why it matters.' },
        { leader: 'Our current priorities are clear enough that people can make everyday trade-offs without constantly asking for permission.',
          team:   'Our priorities are clear enough for me to make everyday trade-offs without constantly asking for permission.' },
        { leader: 'People understand how their work connects to the team&rsquo;s larger goals.',
          team:   'I understand how my work connects to the team&rsquo;s larger goals.' },
        { leader: 'When priorities change, we deliberately communicate what changed, why it changed, and what that means for people&rsquo;s work.',
          team:   'When priorities change, I understand what changed, why, and what it means for my work.' }
      ],
      bands: [
        { min: 75, label: 'Shared direction',      text: 'People understand what matters and can connect everyday work to it.' },
        { min: 50, label: 'Direction with gaps',   text: 'Broad direction may be understood, but priorities and trade-offs are not always clear enough to guide everyday decisions.' },
        { min: 0,  label: 'Competing maps',        text: 'People may be working hard toward different interpretations of what matters.' }
      ],
      recommendation: {
        title: 'A strategy and alignment working session',
        text: 'Build shared direction rather than presenting it: surface assumptions, make trade-offs discussable, and connect everyday work to what matters.'
      }
    }
  ];

  /* ---------------------------------------------------- 3. RESULT BANDS */
  var OVERALL_BANDS = [
    { min: 85, label: 'Deliberately Designed',
      text: 'Your responses suggest your team has made many conscious choices about how work happens. Keep inspecting the system so today&rsquo;s deliberate choices do not become tomorrow&rsquo;s unquestioned habits.' },
    { min: 70, label: 'Mostly Intentional',
      text: 'Your responses suggest a lot is working, but habit, interpretation, or individual preference may have quietly taken over in a few places. Find the dimensions with the most friction and make those expectations explicit.' },
    { min: 50, label: 'Too Much Left to Chance',
      text: 'Your responses suggest your team has ways of working, but not enough of them have been chosen deliberately. Good people may be compensating for system friction. Make key expectations explicit.' },
    { min: 0,  label: 'Running on Defaults',
      text: 'Your responses suggest work is getting done, but probably harder than it needs to be. Meetings, decisions, information, and collaboration may depend heavily on unwritten rules, hierarchy, and individual habits. Start with the biggest source of friction.' }
  ];

  /* ------------------------------------------ 4. CROSS-DIMENSION PATTERNS */
  /* §11.7. `specificity` breaks ties when several patterns trigger: a
     two-condition pattern says more than "four dimensions are low". */
  var PATTERNS = [
    {
      id: 'meeting-not-meeting',
      title: 'The meeting problem isn&rsquo;t a meeting problem',
      involves: ['MEET', 'DECIDE'],
      specificity: 3,
      test: function (d) { return d.MEET < 60 && d.DECIDE < 60; },
      message: 'Your meetings may be carrying your decision problem. Before redesigning agendas, examine how authority and decision-making work.'
    },
    {
      id: 'meeting-is-information-system',
      title: 'The meeting is the information system',
      involves: ['MEET', 'SHARE'],
      specificity: 3,
      test: function (d) { return d.MEET < 60 && d.SHARE < 60; },
      message: 'You may be meeting because that&rsquo;s how information travels. Improving information flow may remove meetings without a no-meeting policy.'
    },
    {
      id: 'permission-problem',
      title: 'The permission problem',
      involves: ['DECIDE', 'ALIGN'],
      specificity: 4,
      test: function (d) { return d.DECIDE < 50 && d.ALIGN >= 65; },
      message: 'People may know where they&rsquo;re going but not what they&rsquo;re allowed to decide along the way. Look at decision rights, authority, and escalation.'
    },
    {
      id: 'ta-da-organization',
      title: 'The ta-da organization',
      involves: ['SHARE', 'ALIGN'],
      specificity: 4,
      test: function (d) { return d.SHARE < 50 && d.ALIGN < 60; },
      message: 'Important things may be arriving as a ta-da. People may hear about decisions, strategies, or changes once finished rather than having enough context along the way.'
    },
    {
      id: 'heroic-team',
      title: 'The heroic team',
      involves: ['AGREE'],
      specificity: 4,
      test: function (d, overall) { return overall >= 65 && d.AGREE < 50; },
      message: 'Your people may be compensating for your system. Capture what is working before it depends entirely on the current people.'
    },
    {
      id: 'default-operating-system',
      title: 'The default operating system',
      involves: ['MEET', 'DECIDE', 'SHARE', 'AGREE', 'ALIGN'],
      specificity: 1,
      test: function (d) {
        return ['MEET','DECIDE','SHARE','AGREE','ALIGN']
          .filter(function (k) { return d[k] < 60; }).length >= 4;
      },
      message: 'Do not treat this as five separate fixes. Step back and deliberately design the team&rsquo;s broader ways of working.'
    }
  ];

  /* -------------------------------------------------------- 5. SCORING */
  /* answers: { MEET: [p,p,p,p], ... } — raw point values.
     Returns the full result object used by the results screen. */
  function score(answers) {
    var dim = {}, total = 0;

    DIMENSIONS.forEach(function (d) {
      var pts = (answers[d.key] || []).reduce(function (a, b) { return a + (b || 0); }, 0);
      dim[d.key] = Math.round((pts / MAX_PER_DIMENSION) * 100);
      total += pts;
    });

    var overall = Math.round((total / MAX_TOTAL) * 100);

    var sorted = DIMENSIONS.map(function (d) {
      return { key: d.key, name: d.name, pct: dim[d.key] };
    }).sort(function (a, b) { return b.pct - a.pct; });

    var top = sorted[0].pct, bottom = sorted[sorted.length - 1].pct;
    var strengths = sorted.filter(function (s) { return s.pct === top; });
    var frictions = sorted.filter(function (s) { return s.pct === bottom; });

    /* §11.8 — patterns are evaluated after dimension scores, and the
       recommendation is selected after pattern evaluation. */
    var triggered = PATTERNS.filter(function (p) { return p.test(dim, overall); });

    var lowestKeys = frictions.map(function (f) { return f.key; });
    /* "Two lowest within 5 percentage points" widens what counts as low,
       so a pattern can reframe a near-tie. */
    var nearLowest = sorted.filter(function (s) { return s.pct - bottom <= 5; })
                           .map(function (s) { return s.key; });

    var primary = pickPattern(triggered, lowestKeys, nearLowest);
    var secondary = triggered.filter(function (p) { return p !== primary; })
                             .sort(bySpecificity)[0] || null;

    return {
      dimensions: dim,
      overall: overall,
      totalPoints: total,
      band: OVERALL_BANDS.filter(function (b) { return overall >= b.min; })[0],
      ranked: sorted,
      strength: strengths[0],
      strengthTied: strengths.length > 1 ? strengths : null,
      friction: frictions[0],
      frictionTied: frictions.length > 1 ? frictions : null,
      nearLowest: nearLowest,
      patterns: triggered,
      primaryPattern: primary,
      secondaryPattern: secondary,
      recommendation: recommend(frictions, primary)
    };
  }

  function bySpecificity(a, b) { return b.specificity - a.specificity; }

  /* Prioritise the pattern that contains the lowest dimension and is most
     specific. Show at most one primary. (§11.8) */
  function pickPattern(triggered, lowestKeys, nearLowest) {
    if (!triggered.length) return null;
    var containsLowest = triggered.filter(function (p) {
      return p.involves.some(function (k) { return lowestKeys.indexOf(k) !== -1; });
    });
    var pool = containsLowest.length ? containsLowest : triggered.filter(function (p) {
      return p.involves.some(function (k) { return nearLowest.indexOf(k) !== -1; });
    });
    if (!pool.length) pool = triggered;
    return pool.sort(bySpecificity)[0];
  }

  /* One primary intervention, based on the lowest-scoring dimension. Never
     five services at once — the output should reduce ambiguity. (§11.8) */
  function recommend(frictions, pattern) {
    var dimension = DIMENSIONS.filter(function (d) { return d.key === frictions[0].key; })[0];
    return {
      dimension: dimension,
      title: dimension.recommendation.title,
      text: dimension.recommendation.text,
      framing: pattern ? pattern.message : null,
      tied: frictions.length > 1 ? frictions : null
    };
  }

  function dimensionBand(key, pct) {
    var d = DIMENSIONS.filter(function (x) { return x.key === key; })[0];
    return d.bands.filter(function (b) { return pct >= b.min; })[0];
  }

  /* -------------------------------------------- 6. PERCEPTION GAP (§12.5) */
  /* Used by the shared view once the team threshold is met. Exposed here so
     the aggregation layer and this page compute gaps identically. */
  var GAP_BANDS = [
    { min: 30, label: 'Different realities',  text: 'Leader and team appear to be experiencing substantially different ways of working.' },
    { min: 20, label: 'Perception gap',       text: 'Leader intent/perception and team experience are meaningfully different.' },
    { min: 10, label: 'Worth a conversation', text: 'There are differences in how this is being experienced.' },
    { min: 0,  label: 'Shared reality',       text: 'Leader and team broadly experience this similarly.' }
  ];
  var TEAM_RESPONSE_THRESHOLD = 5; /* §12.3 — never release below this */

  function perceptionGap(leaderPct, teamAvgPct) {
    var gap = Math.abs(leaderPct - teamAvgPct);
    return {
      gap: gap,
      leader: leaderPct,
      team: teamAvgPct,
      direction: leaderPct === teamAvgPct ? 'level' : (leaderPct > teamAvgPct ? 'leader-higher' : 'team-higher'),
      band: GAP_BANDS.filter(function (b) { return gap >= b.min; })[0]
    };
  }

  /* ------------------------------------------------------------ 7. VIEW */
  var root = document.getElementById('check');
  if (!root) return;

  var perspective = new URLSearchParams(location.search).get('perspective') === 'team' ? 'team' : 'leader';
  var isTeam = perspective === 'team';

  var state = { answers: {}, step: 0, context: {} };
  var firstPaint = true;
  DIMENSIONS.forEach(function (d) { state.answers[d.key] = [null, null, null, null]; });

  /* The launch flow ends with an email capture, not an on-screen score:
     the report is composed and sent by hand. The engine still runs — the
     full result rides along in the submission so writing that email is a
     copy-paste rather than a re-calculation.

     FLOW (brief 11.9): the result is shown immediately on completion, and the
     email capture sits inside it, after the value is visible. The brief is
     explicit that contact details are never required before a result: "the
     exchange should feel fair". */
  /* R5 — the leader flow now gates the result behind contact details:
       intro -> 5 dimensions -> reveal -> results
     The team flow never shows a score, so it skips the gate entirely and
     ends on the anonymous thank-you instead. */
  var STEPS = ['intro']
    .concat(DIMENSIONS.map(function (d) { return d.key; }))
    .concat(perspectiveIsTeam() ? ['results'] : ['reveal', 'results']);

  function perspectiveIsTeam() {
    return new URLSearchParams(location.search).get('perspective') === 'team';
  }

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

  function render() {
    var step = STEPS[state.step];
    root.innerHTML = '';
    if (step === 'intro') { root.appendChild(renderIntro()); }
    else if (step === 'reveal') { root.appendChild(renderReveal()); }
    else if (step === 'results') { root.appendChild(renderResults()); }
    else { root.appendChild(renderDimension(step)); }

    updateProgress();
    /* Move focus to the new step heading so keyboard and screen-reader users
       are not left behind at the bottom of the previous one. On first paint
       we leave focus alone, so the skip link stays the first tab stop. */
    var h = root.querySelector('[data-focus]');
    if (h && !firstPaint) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    firstPaint = false;
    window.scrollTo({ top: 0, behavior: state.step === 0 ? 'auto' : 'smooth' });
  }

  function updateProgress() {
    var bar = document.getElementById('check-progress-bar');
    var text = document.getElementById('check-progress-text');
    var wrap = document.getElementById('check-progress');
    if (!bar) return;
    var isMiddle = state.step > 0 && state.step <= DIMENSIONS.length;
    wrap.hidden = !isMiddle;
    if (!isMiddle) return;
    var pct = Math.round((state.step / DIMENSIONS.length) * 100);
    bar.style.width = pct + '%';
    wrap.setAttribute('aria-valuenow', String(pct));
    text.textContent = 'Section ' + state.step + ' of ' + DIMENSIONS.length + ': ' + DIMENSIONS[state.step - 1].name;
  }

  /* ---- Intro -------------------------------------------------------- */
  function renderIntro() {
    var wrap = el('<div class="stack"></div>');

    if (isTeam) {
      wrap.appendChild(el(
        '<div>' +
        '<p class="kicker">Team perspective</p>' +
        '<h1 data-focus>The &ldquo;How We Work&rdquo; Check</h1>' +
        '<h2 class="mt-2" style="font-size:var(--t-h3);opacity:.6;">Team perspective</h2>' +
        '<p class="lead mt-3">You&rsquo;re being invited to share how you experience the way your team works. There are no right answers. Responses are combined with the rest of the team&rsquo;s and are intended to surface patterns and useful conversations, not evaluate individual people.</p>' +
        '<div class="callout mt-3" style="--accent:var(--cyan);">' +
        '<p class="callout__label">Your privacy</p>' +
        '<p class="ui-text" style="margin:0;">Your answers are anonymous to your team leader. Individual responses are never shown. Results are only released once at least ' + TEAM_RESPONSE_THRESHOLD + ' people have completed the check.</p>' +
        '</div>' +
        '</div>'
      ));
    } else {
      wrap.appendChild(el(
        '<div>' +
        '<p class="kicker">Teams WOW Assessment</p>' +
        '<h1 data-focus>The Ways of Working (WOW) Assessment</h1>' +
        '<p class="lead mt-3">How deliberately has your team designed the way it works?</p>' +
        '<p class="mt-2">Most teams have ways of working. The question is whether you chose them, or whether they just happened. Look at five parts of everyday work and see where things are working, where friction may be hiding, and what may be worth making more explicit.</p>' +
        /* R5-1 — say what this costs in time and money before asking for anything. */
        '<ul class="factbar mt-3">' +
        '<li><b>20</b><span>Questions</span></li>' +
        '<li><b>5</b><span>Dimensions</span></li>' +
        '<li><b>5 min</b><span>Average time</span></li>' +
        '<li><b>Free</b><span>No cost</span></li>' +
        '</ul>' +
        '<div class="callout mt-3" style="--accent:var(--cyan);">' +
        '<p class="callout__label">Before you start</p>' +
        '<p class="ui-text" style="margin:0;">Think about one team you lead or are responsible for. It could be a leadership team, function, department, or smaller team. Answer based on how that team works today, not the wider organization and not how you would like it to work.</p>' +
        '</div>' +
        '</div>'
      ));
    }

    var form = el(
      '<form class="q-card mt-3" novalidate>' +
      '<label class="field"><span>Which team are you assessing?</span>' +
      '<input class="input" name="team" type="text" autocomplete="off" required ' +
      'placeholder="e.g. the leadership team, marketing, the GTM pod"></label>' +
      (isTeam ? '' :
        /* R5-1 — company dropped from the front door. Only team size is
           required, because the bands and the report lean on it. */
        '<div class="grid grid--2" style="gap:0 1.25rem;">' +
        '<label class="field"><span>Your role</span><input class="input" name="role" type="text" autocomplete="organization-title"></label>' +
        '<label class="field"><span>Team size <span class="req">*</span></span>' +
        '<select class="input" name="teamSize" required><option value="">Select&hellip;</option><option>2&ndash;5</option><option>6&ndash;10</option><option>11&ndash;20</option><option>21&ndash;50</option><option>50+</option></select></label>' +
        '</div>') +
      '<p class="meta" style="margin:.5rem 0 1.5rem;">Five sections. Twenty questions. About five minutes.</p>' +
      '<button class="btn btn--primary btn--lg" type="submit">Start the check <span aria-hidden="true">&rarr;</span></button>' +
      '<p class="mt-2" role="alert" data-error hidden style="color:var(--red);font-family:var(--ui);font-weight:600;"></p>' +
      '</form>'
    );

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var team = form.team.value.trim();
      var err = form.querySelector('[data-error]');
      if (!team) {
        err.textContent = 'Please name the team you&rsquo;re thinking about. It keeps your answers anchored to one team.';
        err.hidden = false;
        form.team.focus();
        return;
      }
      /* R5-1 — team size is the only required extra on the leader instrument.
         Role is optional; company is no longer asked here at all. The team
         version never asks for any of them, so this only runs when present. */
      var need = [
        [form.teamSize, 'your team size']
      ].filter(function (f) { return f[0] && !String(f[0].value).trim(); });
      if (need.length) {
        err.textContent = 'Still needed: ' + need.map(function (f) { return f[1]; }).join(', ') + '.';
        err.hidden = false;
        need[0][0].focus();
        return;
      }
      err.hidden = true;
      state.context = {
        team: team,
        role: form.role ? form.role.value.trim() : '',
        teamSize: form.teamSize ? form.teamSize.value : '',
        perspective: perspective
      };
      track('check_started', { perspective: perspective });
      state.step++;
      render();
    });

    wrap.appendChild(form);
    return wrap;
  }

  /* ---- One dimension ------------------------------------------------ */
  function renderDimension(key) {
    var d = DIMENSIONS.filter(function (x) { return x.key === key; })[0];
    var index = DIMENSIONS.indexOf(d);

    var wrap = el('<div></div>');
    wrap.appendChild(el(
      '<div class="section-head" style="margin-bottom:2rem;">' +
      '<p class="kicker">' + d.name + ': 0' + (index + 1) + ' of 0' + DIMENSIONS.length + '</p>' +
      '<h2 data-focus>' + d.question + '</h2>' +
      '</div>'
    ));

    var form = el('<form novalidate></form>');

    d.questions.forEach(function (q, qi) {
      var text = isTeam ? q.team : q.leader;
      var name = key + '-' + qi;
      var options = SCALE.map(function (opt, oi) {
        var checked = state.answers[key][qi] === opt.points &&
                      state.answers[key][qi + '_choice'] !== undefined
                      ? '' : '';
        var isChecked = state.answers[key + '_choice'] && state.answers[key + '_choice'][qi] === oi;
        return '<label><input type="radio" name="' + name + '" value="' + oi + '"' +
               (isChecked ? ' checked' : '') + '><span>' + opt.label + '</span></label>';
      }).join('');

      form.appendChild(el(
        '<fieldset class="q-card" style="margin-bottom:1.75rem;border:0;padding:0;">' +
        '<div class="q-card">' +
        '<legend class="q-legend" style="float:none;">' +
        '<span class="meta" style="display:block;margin-bottom:.6rem;">Question ' + (index * 4 + qi + 1) + ' of 20</span>' +
        text + '</legend>' +
        '<div class="scale">' + options + '</div>' +
        '</div>' +
        '</fieldset>'
      ));
    });

    /* §11.3 — one optional, unscored question at the end of the instrument. */
    if (index === DIMENSIONS.length - 1) {
      form.appendChild(el(
        '<div class="q-card" style="margin-bottom:1.75rem;--accent:var(--yellow);">' +
        '<label class="field" style="margin:0;">' +
        '<span>One last thing <em style="text-transform:none;letter-spacing:0;opacity:.6;">(optional, not scored)</em></span>' +
        '<span class="q-legend" style="display:block;margin:.4rem 0 1rem;">If you could change ONE thing about how your team works tomorrow, what would it be?</span>' +
        '<textarea class="input" name="oneThing" rows="4" style="font-family:var(--ui);resize:vertical;"></textarea>' +
        '</label></div>'
      ));
    }

    var nav = el(
      '<div class="btn-row mt-3">' +
      '<button class="btn btn--primary btn--lg" type="submit">' +
      (index === DIMENSIONS.length - 1 ? 'See my result' : 'Next: ' + DIMENSIONS[index + 1].name) +
      ' <span aria-hidden="true">&rarr;</span></button>' +
      '<button class="btn btn--ghost" type="button" data-back>Back</button>' +
      '</div>'
    );
    form.appendChild(nav);
    form.appendChild(el('<p class="mt-2" role="alert" data-error hidden style="color:var(--red);font-family:var(--ui);font-weight:600;"></p>'));

    nav.querySelector('[data-back]').addEventListener('click', function () {
      state.step--; render();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var missing = [];
      state.answers[key + '_choice'] = state.answers[key + '_choice'] || [];
      d.questions.forEach(function (q, qi) {
        var picked = form.querySelector('input[name="' + key + '-' + qi + '"]:checked');
        if (!picked) { missing.push(qi + 1); return; }
        var oi = parseInt(picked.value, 10);
        state.answers[key + '_choice'][qi] = oi;
        state.answers[key][qi] = SCALE[oi].points;
      });
      var err = form.querySelector('[data-error]');
      if (missing.length) {
        err.textContent = 'Please answer ' + (missing.length === 1 ? 'question ' : 'questions ') +
                          missing.join(', ') + ' in this section before moving on.';
        err.hidden = false;
        var first = form.querySelector('input[name="' + key + '-' + (missing[0] - 1) + '"]');
        if (first) first.focus();
        return;
      }
      err.hidden = true;
      if (form.oneThing) state.context.oneThing = form.oneThing.value.trim();
      state.step++;
      if (state.step > DIMENSIONS.length) track('check_completed', { perspective: perspective });
      render();
    });

    wrap.appendChild(form);
    return wrap;
  }



  /* Everything the manual email needs, in one object. */
  function buildPayload(r) {
    return {
      respondentType: 'leader',
      submittedAt: new Date().toISOString(),
      firstName: state.context.firstName,
      email: state.context.email,
      company: state.context.company,
      role: state.context.role,
      whatsapp: state.context.whatsapp || null,
      team: state.context.team,
      teamSize: state.context.teamSize,
      dimensionPercentages: r.dimensions,
      overall: r.overall,
      overallBand: r.band.label,
      strength: r.strength.key,
      friction: r.friction.key,
      frictionTied: r.frictionTied ? r.frictionTied.map(function (f) { return f.key; }) : null,
      patterns: r.patterns.map(function (p) { return p.id; }),
      primaryPattern: r.primaryPattern ? r.primaryPattern.id : null,
      recommendation: r.recommendation.title,
      oneThing: state.context.oneThing || null,
      source: document.referrer || null,
      query: location.search || null,
      summary: buildSummary(r)
    };
  }

  /* A plain-text digest, ready to paste into the email. */
  function buildSummary(r) {
    var strip = function (t) { return String(t).replace(/&[a-z]+;/g, function (m) {
      return { '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"', '&mdash;': ',', '&amp;': '&' }[m] || m; }); };
    var lines = [];
    lines.push('TEAM: ' + state.context.team + (state.context.teamSize ? ' (' + state.context.teamSize + ')' : ''));
    lines.push('OVERALL: ' + r.overall + '/100, ' + r.band.label);
    lines.push('');
    r.ranked.forEach(function (d) {
      var band = dimensionBand(d.key, d.pct);
      lines.push(pad(d.name.toUpperCase(), 8) + pad(String(d.pct), 5) + strip(band.label));
    });
    lines.push('');
    lines.push('STRENGTH: ' + r.strength.name);
    lines.push('FRICTION: ' + r.friction.name + (r.frictionTied ? ' (tied with ' + r.frictionTied.slice(1).map(function (f) { return f.name; }).join(', ') + ')' : ''));
    if (r.primaryPattern) lines.push('PATTERN:  ' + strip(r.primaryPattern.title) + ': ' + strip(r.primaryPattern.message));
    if (r.secondaryPattern) lines.push('ALSO:     ' + strip(r.secondaryPattern.title));
    lines.push('START AT: ' + strip(r.recommendation.title));
    if (state.context.whatsapp) lines.push('WHATSAPP: ' + state.context.whatsapp);
    if (state.context.oneThing) { lines.push(''); lines.push('ONE THING THEY\'D CHANGE: "' + state.context.oneThing + '"'); }
    return lines.join('\n');
  }
  function pad(s, n) { while (s.length < n) s += ' '; return s; }

  /* ---- Results (retained) --------------------------------------------- */

  function renderResults() {
    if (isTeam) return renderTeamThanks();

    var r = score(state.answers);
    window.__oiResult = r; /* handy for the form handler and for QA */

    var wrap = el('<div></div>');

    /* 1 · the label first, the number second (§11.9) */
    wrap.appendChild(el(
      '<div class="score-hero">' +
      '<p class="kicker" style="color:var(--paper);">Your result: ' + escapeHtml(state.context.team) + '</p>' +
      '<h1 data-focus style="color:var(--paper);">' + r.band.label + '</h1>' +
      '<p class="lead mt-3" style="color:var(--paper);opacity:.9;">' + r.band.text + '</p>' +
      '<div class="mt-3" style="display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap;">' +
      '<span class="score-num">' + r.overall + '</span>' +
      '<span class="meta" style="color:var(--paper);opacity:.7;max-width:44ch;">Overall How We Work score, out of 100. A reflection prompt, not a measure of organizational effectiveness.</span>' +
      '</div>' +
      '</div>'
    ));

    /* 2 · five dimensions, visually */
    var bars = el('<div class="mt-3"><p class="kicker kicker--plain">The five dimensions</p><ul class="bars"></ul></div>');
    var list = bars.querySelector('ul');
    /* Red marks the friction and lime the strength, because those two carry
       meaning. Everything in between used to be cobalt, which meant three
       identical blue bars on a typical result. The neutrals now cycle so no
       two adjacent bars share a colour. */
    var NEUTRALS = ['var(--violet)', 'var(--cyan)', 'var(--cobalt)'];
    var neutralIndex = 0;

    DIMENSIONS.forEach(function (d) {
      var pct = r.dimensions[d.key];
      var band = dimensionBand(d.key, pct);
      var isLow = pct === r.friction.pct, isHigh = pct === r.strength.pct;
      if (isLow && isHigh) { isLow = false; isHigh = false; } /* flat result: nothing stands out */
      var colour;
      if (isLow) { colour = 'var(--red)'; }
      else if (isHigh) { colour = 'var(--lime)'; }
      else { colour = NEUTRALS[neutralIndex % NEUTRALS.length]; neutralIndex++; }
      list.appendChild(el(
        '<li>' +
        '<div class="bar__top"><span class="bar__name">' + d.name + '</span>' +
        '<span class="bar__val">' + pct + '<span style="font-size:.9rem;opacity:.5;">/100</span></span></div>' +
        '<div class="bar__track"><div class="bar__fill" style="background:' + colour + ';" data-w="' + pct + '"></div></div>' +
        '<p class="bar__label">' + band.label + '. <span style="font-weight:400;">' + band.text + '</span></p>' +
        '</li>'
      ));
    });
    wrap.appendChild(bars);

    /* 3 · strength and friction */
    var callouts = el('<div class="grid grid--2 mt-3"></div>');
    callouts.appendChild(el(
      '<div class="callout" style="--accent:var(--lime);">' +
      '<p class="callout__label">Your strength</p>' +
      '<h3>' + r.strength.name + '</h3>' +
      '<p class="ui-text" style="margin:0;">' + dimensionBand(r.strength.key, r.strength.pct).text +
      (r.strengthTied ? ' <em>Tied with ' + r.strengthTied.slice(1).map(function (s) { return s.name; }).join(' and ') + '.</em>' : '') +
      '</p></div>'
    ));
    callouts.appendChild(el(
      '<div class="callout" style="--accent:var(--red);">' +
      '<p class="callout__label">Your biggest friction</p>' +
      '<h3>' + r.friction.name + '</h3>' +
      '<p class="ui-text" style="margin:0;">' + dimensionBand(r.friction.key, r.friction.pct).text +
      (r.frictionTied ? ' <em>Tied with ' + r.frictionTied.slice(1).map(function (s) { return s.name; }).join(' and ') + '. Worth reading both together rather than picking one.</em>' : '') +
      '</p></div>'
    ));
    wrap.appendChild(callouts);

    /* 4 · at most one primary pattern, optionally one secondary insight */
    if (r.primaryPattern) {
      wrap.appendChild(el(
        '<div class="card card--ink mt-3" style="--accent:var(--lime);">' +
        '<p class="card__index">The pattern we&rsquo;d look at</p>' +
        '<h3>' + r.primaryPattern.title + '</h3>' +
        '<p class="mt-2" style="margin-bottom:0;">' + r.primaryPattern.message + '</p>' +
        '</div>'
      ));
    }
    if (r.secondaryPattern) {
      wrap.appendChild(el(
        '<div class="callout mt-2" style="--accent:var(--cyan);">' +
        '<p class="callout__label">One more thing worth noticing</p>' +
        '<p class="ui-text" style="margin:0;"><strong>' + r.secondaryPattern.title + '.</strong> ' + r.secondaryPattern.message + '</p>' +
        '</div>'
      ));
    }

    /* 5 · one recommended place to start */
    wrap.appendChild(el(
      '<div class="callout mt-3" style="--accent:var(--cobalt);">' +
      '<p class="callout__label">Where we&rsquo;d start</p>' +
      '<h3>' + r.recommendation.title + '</h3>' +
      '<p class="ui-text">' + r.recommendation.text + '</p>' +
      '<p class="ui-text" style="margin-bottom:0;opacity:.75;">Based on ' + r.recommendation.dimension.name +
      ' being your lowest-scoring dimension' + (r.primaryPattern ? ', read alongside the pattern above' : '') + '.</p>' +
      '</div>'
    ));

    /* The one thing they'd change — read back, never scored. */
    if (state.context.oneThing) {
      wrap.appendChild(el(
        '<div class="callout mt-3" style="--accent:var(--yellow);">' +
        '<p class="callout__label">The one thing you&rsquo;d change</p>' +
        '<p class="ui-text" style="margin:0;font-style:italic;">&ldquo;' + escapeHtml(state.context.oneThing) + '&rdquo;</p>' +
        '<p class="ui-text" style="margin:1rem 0 0;opacity:.7;">Worth bringing to the conversation. It usually says more than the scores do.</p>' +
        '</div>'
      ));
    }

    /* 5b · confirm the exchange we just made at the gate */
    if (state.context.email) {
      wrap.appendChild(el(
        '<p class="meta mt-3" style="border-top:var(--rule-hair);padding-top:1rem;">' +
        'Your full report is on its way to <strong>' + escapeAttr(state.context.email) + '</strong>' +
        (state.context.whatsapp ? ', and to your WhatsApp number' : '') + '.</p>'
      ));
    }

    /* 6 · the next step, stated as a next step (R5-4) */
    wrap.appendChild(el(
      '<div class="q-card mt-3 nextstep">' +
      '<p class="kicker">What happens next</p>' +
      '<h2>Your next step is a 30-minute consulting call.</h2>' +
      '<p class="lead mt-2">Book a complimentary call to close gaps and accelerate outcomes.</p>' +
      '<div class="btn-row mt-3">' +
      '<a class="btn btn--primary btn--lg" href="book.html" data-carry-source data-event="book_consultation" data-placement="check_results">Book Your Call <span aria-hidden="true">&rarr;</span></a>' +
      '</div></div>'
    ));

    /* 7 · and only then the second perspective (R5-5) */
    wrap.appendChild(renderTeamInvite(r));

    /* 8 · quiet exit */
    wrap.appendChild(el(
      '<div class="section--tight mt-3" style="border-top:var(--rule);padding-bottom:0;">' +
      '<div class="btn-row">' +
      '<button class="btn btn--ghost" type="button" data-restart>Start over</button>' +
      '</div></div>'
    ));

    wrap.querySelector('[data-restart]').addEventListener('click', function () {
      DIMENSIONS.forEach(function (d) {
        state.answers[d.key] = [null, null, null, null];
        delete state.answers[d.key + '_choice'];
      });
      state.step = 0;
      render();
    });

    /* animate the bars in after paint */
    requestAnimationFrame(function () {
      wrap.querySelectorAll('.bar__fill').forEach(function (b) { b.style.width = b.dataset.w + '%'; });
    });

    return wrap;
  }

  /* ---- The reveal gate (R5-3) ----------------------------------------
     Sits between the last question and the result. The visitor has already
     done the work by this point, so the ask is deliberately small: a first
     name, a work email, and an optional WhatsApp number. Company is not
     asked here. It is inferable from the email domain, and every extra
     field costs completions at exactly the wrong moment.                 */
  function renderReveal() {
    var wrap = el('<div class="stack"></div>');
    var r = score(state.answers);

    var box = el(
      '<div class="q-card" style="--accent:var(--cobalt);">' +
      '<p class="kicker">Almost there</p>' +
      '<h1 data-focus style="font-size:var(--d3);">Where shall we send your report?</h1>' +
      '<p class="lead mt-3">Your score and full breakdown appear on the next screen. We send the written report to the address you give us.</p>' +
      '<form class="mt-3" novalidate data-lead data-endpoint="/api/assessment">' +
      '<div class="grid grid--2" style="gap:0 1.25rem;">' +
      '<label class="field"><span>First name <span class="req">*</span></span><input class="input" name="firstName" type="text" autocomplete="given-name" required></label>' +
      '<label class="field"><span>Work email <span class="req">*</span></span><input class="input" name="email" type="email" autocomplete="email" required></label>' +
      '</div>' +
      /* Full width on its own row: numbers are long, and a third field in a
         two-column grid would otherwise sit beside an empty cell. No format
         validation, deliberately, because international numbers vary too much
         to reject any of them safely. */
      '<label class="field"><span>WhatsApp number <em style="text-transform:none;letter-spacing:0;opacity:.6;">(optional)</em></span>' +
      '<input class="input" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel">' +
      '<em class="field__hint">If you\u2019d rather we send the report there.</em></label>' +
      '<button class="btn btn--primary btn--lg" type="submit">Reveal results <span aria-hidden="true">&rarr;</span></button>' +
      '<p class="mt-2" role="alert" data-error hidden style="color:var(--red);font-family:var(--ui);font-weight:600;"></p>' +
      '<p class="meta" style="margin-top:1.25rem;">We&rsquo;ll use these details to send your report. Newsletter subscription is handled separately. Read our <a href="privacy.html">privacy policy</a>.</p>' +
      '</form>' +
      '</div>'
    );

    var form = box.querySelector('[data-lead]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = form.querySelector('[data-error]');
      var email = form.email.value.trim();
      if (!form.firstName.value.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
        err.textContent = 'Please add your first name and a valid work email.';
        err.hidden = false;
        return;
      }
      err.hidden = true;

      /* The payload the CRM / automation layer needs — §13 column list. */
      var payload = {
        respondentType: 'leader',
        team: state.context.team,
        teamSize: state.context.teamSize,
        firstName: form.firstName.value.trim(),
        email: email,
        company: emailDomain(email),
        role: state.context.role || '',
        whatsapp: form.whatsapp.value.trim() || null,
        dimensionPercentages: r.dimensions,
        overall: r.overall,
        overallBand: r.band.label,
        strength: r.strength.key,
        friction: r.friction.key,
        patterns: r.patterns.map(function (p) { return p.id; }),
        primaryPattern: r.primaryPattern ? r.primaryPattern.id : null,
        recommendation: r.recommendation.title,
        oneThing: state.context.oneThing || null,
        source: document.referrer || null,
        query: location.search || null
      };

      /* Keep context in step so the digest and result render see it. */
      state.context.firstName = payload.firstName;
      state.context.email     = payload.email;
      state.context.whatsapp  = payload.whatsapp;

      var endpoint = form.getAttribute('data-endpoint');
      document.dispatchEvent(new CustomEvent('oi:lead', { detail: payload }));
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending report…';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (body) {
            if (!response.ok) throw new Error(body.error || 'We could not send your report. Please try again.');
          });
        })
        .then(function () {
          track('check_lead_captured', { placement: 'check_reveal_gate' });
          state.step++;
          render();
        })
        .catch(function (sendError) {
          btn.disabled = false;
          btn.innerHTML = 'Reveal results <span aria-hidden="true">&rarr;</span>';
          err.textContent = sendError.message || 'We could not send your report. Please try again.';
          err.hidden = false;
        });
    });

    wrap.appendChild(box);
    return wrap;
  }

  /* Company is no longer asked for. A work email domain is a good enough
     stand-in for routing and dedupe, and free-mail domains are left out
     rather than recorded as if they were a company. */
  var FREEMAIL = ['gmail.com','googlemail.com','outlook.com','hotmail.com','live.com',
                  'yahoo.com','icloud.com','me.com','proton.me','protonmail.com','aol.com'];
  function emailDomain(email) {
    var d = String(email).split('@')[1];
    if (!d) return '';
    d = d.toLowerCase();
    return FREEMAIL.indexOf(d) === -1 ? d : '';
  }

  /* ---- Optional team perspective (§12.1 / §12.2) --------------------- */
  function renderTeamInvite(r) {
    var lowest = r.friction.name.toUpperCase();
    var personalised = 'You see <strong>' + lowest + '</strong> as your team&rsquo;s biggest source of friction. ' +
      'Does your team experience it the same way? Invite them to take a short anonymous check. ' +
      'We&rsquo;ll show you where your perspectives line up, and where they don&rsquo;t.';
    var generic = 'You&rsquo;ve looked at how work happens from your seat as a leader. That&rsquo;s valuable on its own, ' +
      'and gives you places to start. If you&rsquo;re curious, you can also invite your team to take a short version of ' +
      'the &ldquo;How We Work&rdquo; Check anonymously. We&rsquo;ll show you where your experiences align, and where they may differ.';

    var box = el(
      '<div class="callout mt-3" style="--accent:var(--cyan);">' +
      '<p class="callout__label">Optional next step</p>' +
      '<h3>Want another perspective?</h3>' +
      '<p class="ui-text mt-2">' + personalised + '</p>' +
      '<p class="ui-text" style="opacity:.75;">' + generic + '</p>' +
      '<div class="btn-row mt-2">' +
      '<button class="btn btn--primary" type="button" data-invite>Invite my team <span aria-hidden="true">&rarr;</span></button>' +
      '<button class="btn btn--ghost" type="button" data-later>Maybe later</button>' +
      '</div>' +
      '<div hidden data-invite-panel class="mt-3" style="border-top:var(--rule-hair);padding-top:1.5rem;">' +
      '<p class="ui-text"><strong>Share this link with your team.</strong> Responses are anonymous. ' +
      'We&rsquo;ll only show you the combined view once at least ' + TEAM_RESPONSE_THRESHOLD + ' people have answered.</p>' +
      '<label class="field"><span>Team link</span><input class="input" data-invite-link readonly></label>' +
      '<button class="btn btn--sm" type="button" data-copy>Copy link</button>' +
      '</div>' +
      '</div>'
    );

    box.querySelector('[data-later]').addEventListener('click', function () { box.remove(); });

    box.querySelector('[data-invite]').addEventListener('click', function () {
      /* A team identifier links anonymous responses to the right leader
         without exposing identity (§13). Replace with a server-issued id. */
      var teamId = 'tmp-' + Math.abs(hash(state.context.team + '|' + (state.context.company || ''))).toString(36);
      var url = location.origin + location.pathname + '?perspective=team&t=' + teamId;
      var panel = box.querySelector('[data-invite-panel]');
      panel.hidden = false;
      panel.querySelector('[data-invite-link]').value = url;
      track('team_invite_clicked', { placement: 'check_results' });
    });

    box.querySelector('[data-copy]').addEventListener('click', function (e) {
      var input = box.querySelector('[data-invite-link]');
      input.select();
      try { navigator.clipboard.writeText(input.value); } catch (err) { document.execCommand('copy'); }
      e.target.textContent = 'Copied';
      setTimeout(function () { e.target.textContent = 'Copy link'; }, 1800);
    });

    return box;
  }

  /* Team members never see a score — the aggregate belongs to the team. */
  function renderTeamThanks() {
    var payload = {
      respondentType: 'team-member',
      teamId: new URLSearchParams(location.search).get('t') || null,
      team: state.context.team,
      oneThing: state.context.oneThing || null,
      answers: DIMENSIONS.reduce(function (acc, d) { acc[d.key] = state.answers[d.key]; return acc; }, {})
    };
    document.dispatchEvent(new CustomEvent('oi:team-response', { detail: payload }));
    track('team_response_completed', {});
    if (window.console) console.info('[OI] Team response (no endpoint configured yet):', payload);

    return el(
      '<div class="score-hero">' +
      '<p class="kicker" style="color:var(--paper);">Thank you</p>' +
      '<h1 data-focus style="color:var(--paper);">That&rsquo;s it. Thank you.</h1>' +
      '<p class="lead mt-3" style="color:var(--paper);opacity:.9;">Your answers have been added to your team&rsquo;s responses. They are anonymous: your leader will only ever see the combined picture, and only once at least ' + TEAM_RESPONSE_THRESHOLD + ' people have taken part.</p>' +
      '<p class="mt-3" style="color:var(--paper);opacity:.75;margin-bottom:0;">If the conversation that follows is a good one, that was the point.</p>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------ HELPERS */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hash(s) {
    var h = 0; for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return h;
  }
  function track(event, extra) {
    var detail = Object.assign({ event: event }, extra || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);
    document.dispatchEvent(new CustomEvent('oi:track', { detail: detail }));
  }

  /* Expose the pure logic for unit tests and for the aggregation layer. */
  window.OICheck = {
    SCALE: SCALE,
    DIMENSIONS: DIMENSIONS,
    OVERALL_BANDS: OVERALL_BANDS,
    PATTERNS: PATTERNS,
    GAP_BANDS: GAP_BANDS,
    TEAM_RESPONSE_THRESHOLD: TEAM_RESPONSE_THRESHOLD,
    score: score,
    dimensionBand: dimensionBand,
    perceptionGap: perceptionGap
  };

  render();
})();
