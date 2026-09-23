/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, platformCoreTools } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { dashboardManagementSkill as skill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';
import { dashboardSkillDocPath, dashboardSkillDocs } from './docs';

const doc = (name: string): string => {
  const content = skill.referencedContent?.find((rc) => rc.name === name)?.content;
  if (!content) {
    throw new Error(`Missing referenced document '${name}'`);
  }
  return content;
};
const everyDocument = () => (skill.referencedContent ?? []).map((rc) => rc.content).join('\n');

describe('registerSkills', () => {
  it('registers the dashboard management skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    registerSkills(agentBuilder);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard-management' }));
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(skill.content).toContain('platform.core.sml_search');
    expect(skill.content).toContain('platform.core.sml_attach');
  });

  it('indexes every document with its agent-visible path and OKF frontmatter', () => {
    for (const document of dashboardSkillDocs) {
      expect(skill.content).toContain(`[${document.title}](${dashboardSkillDocPath(document)})`);
      expect(doc(document.name)).toContain(`type: ${document.type}`);
      expect(doc(document.name)).toContain(`title: "${document.title}"`);
    }
    expect(skill.content).toContain('read every document listed for your task with `read_file`');
  });

  it('moves the dashboard design guidance into reference documents', () => {
    expect(doc('composition')).toContain('Dashboard Composition Guidelines');
    expect(doc('grid_layout')).toContain('Grid Packing Rules');
    expect(doc('panels')).toContain('show avg/min/max in the legend');
    expect(doc('panels')).toContain('at least one and at most two of those primary time-series XY');
    expect(skill.content).not.toContain('Grid Packing Rules');
  });

  it('delegates enhance presentation defaults to the chart author', () => {
    const enhance = doc('enhance_dashboard');
    expect(enhance).toContain('Improving an Existing Dashboard (Enhance)');
    expect(enhance).toContain('applyChartRules: true');
    expect(enhance).toContain('for every existing ES|QL Lens panel');
    expect(enhance).toContain('preserveESQL: true');
    expect(doc('edit_dashboard')).toContain(
      'a query change and presentation enhancement can share one edit'
    );
    // Lens mechanics stay with the chart author.
    expect(skill.content).not.toContain('apply_color_to');
    expect(everyDocument()).not.toContain('apply_color_to');
    expect(everyDocument()).not.toContain('CHART RULES FOR');
  });

  it('assesses the dashboard and asks which enhance mode to apply', () => {
    const enhance = doc('enhance_dashboard');
    expect(enhance).toContain(
      `Call \`${platformCoreTools.getIndexMapping}\` once per distinct index pattern`
    );
    expect(enhance).toContain('Do not run queries by default');
    expect(enhance).toContain(`call \`${internalTools.askUserQuestion}\` on its own`);
    expect(enhance).toContain('"Appearance only" and "Appearance and content"');
    expect(enhance).toContain('Ask even when you found no gaps');
    expect(enhance).toContain('Content mode is the default');
    expect(enhance).toContain(
      "Skip this step only when the user's message already states a mode or names specific changes"
    );
  });

  it('separates appearance-only and content enhance modes', () => {
    const enhance = doc('enhance_dashboard');
    expect(enhance).toContain('**Appearance mode.** Keep every panel ID');
    expect(enhance).toContain(
      'Do not add, remove, or recreate panels, add controls, or change queries'
    );
    expect(enhance).toContain('**Content mode.** Do everything appearance mode does');
    expect(enhance).toContain('`remove_panels`');
    expect(enhance).toContain(
      'replace non-ES|QL panels with new ES|QL Lens panels without asking again'
    );
    expect(enhance).toContain('Keep the existing time range');
    expect(enhance).toContain('In content mode, confirm the resulting panel set');
  });

  it('keeps chart-type selection in the panels reference document', () => {
    const panels = doc('panels');
    expect(panels).toContain('Chart Type Guidance');
    expect(panels).toContain('Available chart types');
    expect(panels).toContain('- region_map:');
    expect(panels).toContain('only when the terms are short strings');
    expect(panels).toContain('provide a new `chartType` when the request changes the chart family');
    expect(skill.content).not.toContain('Available chart types');
  });
});
