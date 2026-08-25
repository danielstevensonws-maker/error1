/**
 * Credits and licences (ADR-0010).
 *
 * Judge two things: whether the required statement is unmistakably a QUOTATION
 * — something that may not be reworded — rather than more of the surrounding
 * prose, and whether the plain-language sections around it sound like the rest
 * of the product rather than like a terms-of-service page.
 *
 * The statement's exact wording is guarded by test/attribution.test.tsx, which
 * cross-checks it against the SRD extraction. Do not edit the quotation to suit
 * a layout.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Attribution } from './Attribution.js';

const meta: Meta<typeof Attribution> = {
  title: 'Shell/Credits and licences',
  component: Attribution,
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj<typeof Attribution> = { args: { onBack: () => {} } };
