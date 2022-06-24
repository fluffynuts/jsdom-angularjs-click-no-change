Demos the issue raised in jsdom 16.6.0+ where a click event on a checkbox
raised by dispatching a MouseEvent on the checkbox no longer triggers
the ng-change event in angularjs

To demo, run:
```
npm run before-regression
npm run after-regression
```

the first command runs the test with jsdom at 16.5.0 and the second
with jsdom at 16.6.0
