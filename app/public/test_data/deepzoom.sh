src=../data/derived/cropped/
dst=../data/derived/DZI

mkdir -p $dst

for sub in sub1 sub2 sub3; do
	mkdir -p $dst/$sub
    for ((s=1;s<60;s++)); do
    	slide=$(printf "%02i" $s)
    	echo $sub $slide
    	if [ ! -d $dst/$sub/$sub.${slide}_files ]; then
	        vips dzsave $src/$sub.$slide.tif $dst/$sub/$sub.$slide
	    else
	    	echo "WARNING: Image already exists -- not overwriting"
	    fi
    done
done
