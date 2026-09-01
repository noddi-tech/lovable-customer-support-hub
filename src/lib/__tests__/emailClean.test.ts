import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cleanPlainTextBody,
  cutAtScandinavianMarkers,
  cleanEmailHtml,
  clearEmailCleanCache,
  resetLibCleanOverride,
} from '@/lib/emailClean';

/**
 * The library cleaner is behind a flag; force it on for these tests via the
 * session override the UI uses (?cleanv2=1).
 */
function enableCleanV2() {
  resetLibCleanOverride();
  window.sessionStorage.setItem('cleanv2', '1');
  resetLibCleanOverride();
}

describe('emailClean — plain text', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearEmailCleanCache();
    enableCleanV2();
  });

  it('keeps the visible turn and drops a Gmail "On ... wrote:" quote', () => {
    const body = [
      'Hei, dekkene er montert og bilen er klar for henting.',
      '',
      'On Mon, 1 Sep 2026 at 09:12, Kari Nordmann <kari@example.com> wrote:',
      '> Når er bilen ferdig?',
      '> Mvh Kari',
    ].join('\n');

    const { visible } = cleanPlainTextBody(body);
    expect(visible).toContain('dekkene er montert');
    expect(visible).not.toContain('Når er bilen ferdig');
  });

  it('drops a Norwegian Outlook Fra:/Sendt: header block', () => {
    const body = [
      'Takk for tilbakemeldingen, vi ordner dette i dag.',
      '',
      'Fra: Kari Nordmann <kari@example.com>',
      'Sendt: mandag 1. september 2026 09:12',
      'Til: support@noddi.no',
      'Emne: Re: Bestilling 1234',
      '',
      'Hei, jeg lurer på noe.',
    ].join('\n');

    const { visible } = cleanPlainTextBody(body);
    expect(visible).toBe('Takk for tilbakemeldingen, vi ordner dette i dag.');
  });

  it('drops "Sendt fra min iPhone"', () => {
    const body = 'Ja, det passer fint på torsdag.\n\nSendt fra min iPhone';
    const { visible } = cleanPlainTextBody(body);
    expect(visible).toBe('Ja, det passer fint på torsdag.');
  });

  it('drops a "Den ... skrev:" quote', () => {
    const body = [
      'Vi har refundert beløpet.',
      '',
      'Den man. 1. sep. 2026 kl. 09:12 skrev Kari Nordmann <kari@example.com>:',
      '> Hvor er pengene mine?',
    ].join('\n');

    const { visible } = cleanPlainTextBody(body);
    expect(visible).toBe('Vi har refundert beløpet.');
    expect(visible).not.toContain('pengene mine');
  });

  it('drops a forwarded-message separator (Google Groups style)', () => {
    const body = [
      'Videresender til support.',
      '',
      '---------- Forwarded message ---------',
      'From: Kari <kari@example.com>',
      'Subject: Hjelp',
    ].join('\n');

    const { visible } = cleanPlainTextBody(body);
    expect(visible).toBe('Videresender til support.');
  });

  it('never blanks a body — falls back to the original with low confidence', () => {
    // A message that is nothing but a signature marker would otherwise be emptied.
    const body = 'Sendt fra min iPhone med en litt lengre signaturlinje under';
    const result = cleanPlainTextBody(body);
    expect(result.visible).toBe(body);
    expect(result.confidence).toBe('low');
  });

  it('is a no-op when the flag is off', () => {
    window.sessionStorage.setItem('cleanv2', '0');
    resetLibCleanOverride();
    const body = 'Hei\n\nSendt fra min iPhone';
    expect(cleanPlainTextBody(body).visible).toBe(body);
  });

  it('does not cut on prose that merely starts with "From:"', () => {
    const body = 'From: the whole team, thank you for the quick response today.';
    expect(cutAtScandinavianMarkers(body).visible).toBe(body);
  });
});

describe('emailClean — HTML', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearEmailCleanCache();
    enableCleanV2();
  });

  it('strips a blockquote reply chain but keeps the reply', async () => {
    const html = `
      <div>Hei, saken er løst og bilen står klar.</div>
      <div class="gmail_quote">
        <blockquote class="gmail_quote">
          <div>Når er bilen ferdig? Jeg trenger den før helgen, takk.</div>
        </blockquote>
      </div>`;

    const { visible } = await cleanEmailHtml(html);
    expect(visible).toContain('saken er løst');
    expect(visible).not.toContain('Når er bilen ferdig');
  });

  it('keeps cid: inline image sources intact', async () => {
    const html = '<div>Se vedlagt bilde av dekket her.<img src="cid:image001.png@01D9"></div>';
    const { visible } = await cleanEmailHtml(html);
    expect(visible).toContain('cid:image001.png@01D9');
  });

  it('falls back to the original when cleaning would empty the body', async () => {
    const html = '<blockquote>Bare sitert innhold, ingenting eget her.</blockquote>';
    const result = await cleanEmailHtml(html);
    expect(result.visible).toBe(html);
    expect(result.confidence).toBe('low');
  });

  it('is a no-op when the flag is off', async () => {
    window.sessionStorage.setItem('cleanv2', '0');
    resetLibCleanOverride();
    const html = '<div>Hei</div><blockquote>Sitert</blockquote>';
    expect((await cleanEmailHtml(html)).visible).toBe(html);
  });
});
