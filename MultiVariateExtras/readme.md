# MultiVariateExtras

## "dataset" tab

On this tab, you can choose which table of data you want to use.

## "correlation" tab

On this tab, you can tell the plugin to compute a "correlation matrix" as a CODAP table, and you can have CODAP graph those values. Right now it will only compute correlations for pairs of essentially numeric attributes (those that have type "numeric", "date", or "qualitative"); later we hope to add some sort of relationship measurement for essentially categorical attribues (type "categorical" or "checkbox" or no type given). 

The plugin will create a table in CODAP called "PairwiseCorrelations" which you can see by using the "Tables" icon in the upper-left.
Right now, if you click the "compute table" icon again, it will append to the existing table rather than just replacing the old one. This 

The table has a lot more than just correlation values in it. It also reminds us of the data type, units, and description of each attribute. It also gives information about nCases, nBlanks1, nBlanks2, nNeitherMissing, and the correlation between missingness-indicators. And, it gives a 95% confidence interval for the correlation, and a p-value for a hypothesis test with the null hypothesis being that the correlation is zero. You should check whether the usual conditions for statistical inference are valid before using these numbers--in particular, does the data come from random selection? random assignment? etc.

In the graph, CODAP choses the colors in a way that depends on the smallest observed correlation, rather than always presuming that the color system should cover the interval from -1 to +1 so it is comparable across datasets.

In the graph, attributes will show in alphabetic order rather than their order in the table, unless you use the table_order_Predictor and table_order_Response attributes.

Also in the graph, note that the attributes shown on the y-axis "increase" (in alphabetical order) from the bottom up, as is common for a graph's y-axis, rather than from the top down, as is common for tables.


### "Plot Matrix" tab

On this tab (soon to be implemented), you can tell the plugin to generate a matrix of plots, one for each pair of variables. This is like a "scatterplot matrix" (also known as a "matrix of scatterplots") but it will also include appropriate graphs for categorical attributes.

## Credits!

MultiVariateExtras was created by copying the code from the "choosy" plugin by Tim Erickson aka eepsmedia , https://github.com/eepsmedia/plugins/tree/master/choosy
and then making a lot of changes.

Development of MultiVariateExtras was funded by a Tinker fellowship in Summer 2025.

The following bullet points are copied from the "choosy" plugin by Tim Erickson aka eepsmedia , https://github.com/eepsmedia
* The **visibility** and **hidden** eyeball icons are from [Pixel Perfect](https://www.flaticon.com/authors/pixel-perfect) at [www.flaticon.com](https://www.flaticon.com/)
* We made the sliders ourselves.