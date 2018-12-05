import path from 'path';

export default {
	src: path.resolve(process.cwd(), 'src'),
	server: path.resolve(process.cwd(), 'src/server'),
	ui: path.resolve(process.cwd(), 'src/ui'),
	dist: path.resolve(process.cwd(), 'dist'),
	static: path.resolve(process.cwd(), 'static'),
	root: path.resolve(process.cwd()),
	packageInfo: path.resolve(process.cwd(), 'package.json'),
	entry: path.resolve(process.cwd(), 'src/Application.js'),
	nodeModules: path.resolve(process.cwd(), 'node_modules'),
};
