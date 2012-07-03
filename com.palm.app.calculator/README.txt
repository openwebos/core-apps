A simple desktop calculator.

* index.html is the enyo app.
* tests/SpecRunner.html is a Jasmine unit test runner.

Issues:
* Should we repeat unary operations with =?
  	e.g., 6561 sqrt = = ==> 3 or just 81
  Mac and Mojo and current code give 81. iPhone gives 3.

ToDo:
* multiple layouts for different screen sizes/orientations
* preferences
* scientific notation
* thousands separators
* other operators (e.g., as a common scientific or "advanced" calculator)
