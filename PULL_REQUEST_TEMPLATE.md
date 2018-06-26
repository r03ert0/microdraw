<!-- Thank you so much for your contribution to MicroDraw! <3 -->

<!-- Please find a short title for your pull request and describe your changes on the following line: -->


---
<!-- Please go through our check list and replace each `[ ]` by `[X]` when the step is complete, and replace `__` with appropriate data: -->
- [ ] `screenshot_test_walk` generates the same test pictures as there were and does not show any errors
- [ ] These changes fix #__ (github issue number if applicable).
- [ ] All MicroDraw tools behave as expected:
    * **GESTURES**
        - [ ] zoom in and out with two finger drag works
    * **KEYS**
        * right and up arrow key or left and down arrow key
            - [ ] jump to next or previous slice respectively
            - [ ] update the slider accordingly
            - [ ] update the slice number accordingly
        * cmd z undoes
            - [ ] any step back that you have done in their chronological order including
            - [ ] translation of region
            - [ ] drawing region
            - [ ] adding point
            - [ ] deleting point
        to be completed (maybe it is implemented and working for all functions, so we can delete the single step checks)
    * **TOOL BUTTONS**
        * red rectangle in navigation window
            - [ ] corresponds to tissue piece selected in viewer
            - [ ] can be navigated upon mouse down drag
        * navigation tool
            - [ ] navigates the slice inside the viewer upon mouse down drag
        * home button
            - [ ] zooms out to view the data in full screen size view
        * zoomIn tool
            - [ ] zooms one step in upon click
        * zoomOut tool
            - [ ] zooms one step out upon click
        * left arrow
            - [ ] jumps to the previous slice
        * right arrow
            - [ ] jumps to the next slice
        * select tool
            - [ ] selects a region upon click
        * draw tool
            - [ ] draws a new region as bezier curve
        * drawPolygon tool
            - [x] draws a new region as a polygon path
        * simplify tool
            - [ ] decreases the number of points in the region path while aiming at conserving the shape
        * addPoint tool
            - [ ] adds a point to the path upon click at position of mouse click
        * deletePoint tool
            - [ ] deletes a point from the path upon mouse click
        * addRegion tool
            - [ ] unifies two overlapping regions into one
        * deleteRegion tool
            - [ ] deletes a region upon click
        * splitRegion tool
            - [ ] splits one region at the intersection path with a second region
        * rotate tool
            - [ ] rotates a region around the point of mouse click
        * flip tool
            - [ ] flips a region around its vertical axis
        * toPolygon tool
            - [ ] converts the region path from bezier curve to polygon path
        * toBezier
            - [ ] converts the region path from polygon path to bezier curve
        * copy tool
            - [ ] copies a region
        * paste tool
            - [ ] pastes the copied region
        * save tool
            - [ ] saves the set of drawn regions to the database
        * screenshot tool
            - [ ] creates a screenshot of the data layer (not of the annotations yet) at a chosen resolution
        * delete tool
            - [ ] deletes the selected region
        * closeMenu tool
            - [ ] hides the menu bar upon click
        * openMenu tool
            - [ ] shows the menu bar upon click
        * undo tool
            - [ ] undoes the user's actions in reverse chronological order


<!-- Either: -->
- [ ] I implemented tests for these changes OR
- [ ] These changes do not require tests because _____

<!-- Also, please make sure that "Allow edits from maintainers" checkbox is checked, so that we can help you if you get stuck somewhere along the way.-->

<!-- Pull requests that do not address these steps are welcome, but they will require additional verification as part of the review process. -->

<!-- Again, many many thanks for your work! \ö/ -->

