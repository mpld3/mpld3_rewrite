
all: build

sync_current : mplexporter
	rsync -r mplexporter/mplexporter mpld3_rewrite/

sync_submodule : mplexporter
	git submodule init
	git submodule update
	rsync -r mplexporter/mplexporter mpld3_rewrite/

build : sync_submodule
	python setup.py build

inplace : build
	python setup.py build_ext --inplace

install : build
	python setup.py install
