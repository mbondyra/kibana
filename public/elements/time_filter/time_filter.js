export const timeFilter = () => ({
  name: 'time_filter',
  displayName: 'Time Filter',
  help: 'Set a time window',
  image: 'clock',
  height: 50,
  expression: `timefilterControl compact=true column=@timestamp
| render as=time_filter`,
  filter: 'timefilter column=@timestamp from=now-24h to=now',
});
