export const areaChart = () => ({
  name: 'areaChart',
  displayName: 'Area Chart',
  help: 'A customizable area chart',
  expression: `filters
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle bars=0 lines=1 points=0 fill=1}
| render`,
});
