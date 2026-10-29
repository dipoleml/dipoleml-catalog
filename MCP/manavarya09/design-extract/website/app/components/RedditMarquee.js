'use client';

import React from 'react';
import { motion } from 'motion/react';

// Real comments scraped from r/ClaudeAI launch thread:
// https://www.reddit.com/r/ClaudeAI/comments/1sm23sp/
const ALL = [
  { sub: 'r/ClaudeAI', user: 'PewPewDiie',          up: 39, body: 'Is the background representative of the token burn and the ungodly amount of work this task seems like for the model?' },
  { sub: 'r/ClaudeAI', user: 'crypt0amat00r',       up: 17, body: 'Just turned this into an openclaw skill and tested it out. Works great! This is going to be super useful.' },
  { sub: 'r/ClaudeAI', user: 'BeginningReflection4', up: 16, body: 'yeah I want that background as much as I want the tool lol' },
  { sub: 'r/ClaudeAI', user: 'Cheap_Brother1905',    up: 17, body: 'my Claude definitely earned its tokens on this one' },
  { sub: 'r/ClaudeAI', user: 'Fidel___Castro',       up: 5,  body: 'this is diabolical and will make so many companies unhappy, but I love it' },
  { sub: 'r/ClaudeAI', user: 'llufnam',              up: 4,  body: 'This my friend is bloody awesome! Starred.' },
  { sub: 'r/ClaudeAI', user: 'crypt0amat00r',        up: 4,  body: 'Yes! I have a dedicated "scraper" agent and this is the perfect addition to its skillset. Thank you!' },
  { sub: 'r/ClaudeAI', user: 'Cheap_Brother1905',    up: 8,  body: 'It only reads what your browser already sees — computed styles from the live DOM, same as opening DevTools. No scraping content, no bypassing paywalls. Just the CSS.' },
  { sub: 'r/ClaudeAI', user: 'theteddd',             up: 3,  body: 'I want to be able to copy specific animations / interaction design of a website. Can it do that?' },
  { sub: 'r/ClaudeAI', user: 'Cheap_Brother1905',    up: 3,  body: 'It actually does that already — run with --interactions and it captures hover, focus, active states on buttons, links and inputs. Plus all CSS transitions, easings and keyframes.' },
  { sub: 'r/ClaudeAI', user: 'ai_powered_en',        up: 3,  body: 'Yeah but the background was so funny hahaha' },
  { sub: 'r/ClaudeAI', user: 'ImFranny',             up: 3,  body: 'Only upvoted cuz of the background' },
];

const HREF = 'https://www.reddit.com/r/ClaudeAI/comments/1sm23sp/i_built_a_claude_code_plugin_that_extracts_any/';

const COLOR_POOL = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
function avatarColor(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return COLOR_POOL[Math.abs(h) % COLOR_POOL.length];
}

function Card({ t }) {
  const initial = (t.user[0] || 'u').toUpperCase();
  return (
    <a
      href={HREF}
      target="_blank"
      rel="noreferrer"
      className="rdt-card"
    >
      <header className="rdt-meta">
        <span className="rdt-avatar" style={{ background: avatarColor(t.user) }}>{initial}</span>
        <span className="rdt-userblock">
          <span className="rdt-sub">{t.sub}</span>
          <span className="rdt-user">u/{t.user}</span>
        </span>
      </header>
      <p className="rdt-body">{t.body}</p>
      <footer className="rdt-foot">
        <span className="rdt-vote">▲ {t.up}</span>
        <span>reply</span>
        <span>share</span>
        <span style={{ marginLeft: 'auto' }}>open ↗</span>
      </footer>
    </a>
  );
}

function Column({ items, duration = 22, className = '' }) {
  return (
    <div className={`rdt-col ${className}`}>
      <motion.div
        animate={{ translateY: '-50%' }}
        transition={{ duration, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
        className="rdt-stack"
      >
        {[0, 1].map((pass) => (
          <React.Fragment key={pass}>
            {items.map((t, i) => <Card key={`${pass}-${i}`} t={t} />)}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

export default function RedditMarquee() {
  const a = ALL.slice(0, 4);
  const b = ALL.slice(4, 8);
  const c = ALL.slice(8, 12);

  return (
    <div className="rdt-wrap">
      <Column items={a} duration={26} />
      <Column items={b} duration={32} className="rdt-col-md" />
      <Column items={c} duration={29} className="rdt-col-lg" />
    </div>
  );
}
